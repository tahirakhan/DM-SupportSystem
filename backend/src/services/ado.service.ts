import axios, { AxiosInstance } from 'axios';
import { loadConfig } from '../config/config';
import { WorkItem, UserStoryDTO } from '../models/work-item.model';
import { FeatureDTO, StateCount, EMPTY_STATE_COUNT } from '../models/feature.model';
import {
  SprintUpdateData,
  SprintFeatureRow,
  BlockerInfo,
  DependencyInfo,
} from '../models/sprint-update.model';
import {
  PAST_QA_STATES,
  computeWeek,
  isPastQaState,
  calculateTargetWeek1Sp,
} from './sprint-update.helpers';

// Each bucket maps display state key → ADO state strings (lowercase, trimmed)
const STATE_BUCKETS: { key: keyof StateCount; match: string[] }[] = [
  { key: 'new',            match: ['new', 'to do', 'todo'] },
  { key: 'inAnalysis',     match: ['in analysis', 'analysis'] },
  { key: 'readyForRefine', match: ['ready for refine', 'ready for refinement'] },
  { key: 'inRefinement',   match: ['in refinement', 'refinement', 'in refine'] },
  { key: 'sprintReady',    match: ['sprint ready', 'ready for sprint', 'ready'] },
  { key: 'inDevelopment',  match: ['in development', 'active', 'in progress'] },
  { key: 'devComplete',    match: ['dev complete', 'development complete'] },
  { key: 'readyForQA',     match: ['ready for qa', 'in qa', 'qa', 'testing', 'in test', 'in testing'] },
  { key: 'readyForProd',   match: ['ready for prod', 'ready for production'] },
  { key: 'closed',         match: ['closed', 'done', 'resolved', 'completed', 'accepted'] },
  { key: 'blocked',        match: ['blocked', 'impediment', 'on hold'] },
];

function classifyState(rawState: string): keyof StateCount | null {
  const s = rawState.toLowerCase().trim();
  for (const bucket of STATE_BUCKETS) {
    if (bucket.match.includes(s)) return bucket.key;
  }
  return null;
}

const BATCH_SIZE = 200;
const CHILD_RELATION = 'System.LinkTypes.Hierarchy-Forward';
const BLOCKED_TAG = 'blocked';

class AdoService {
  private client: AxiosInstance;
  private project: string;
  private organization: string;

  constructor() {
    const config = loadConfig();
    const token = Buffer.from(`:${config.pat}`).toString('base64');
    this.project = config.project;
    this.organization = config.organization;

    this.client = axios.create({
      baseURL: `https://dev.azure.com/${config.organization}`,
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30_000,
    });
  }

  async getFeatures(areaPath: string, iterationPath: string): Promise<FeatureDTO[]> {
    const featureIds = await this.queryFeatureIds(areaPath, iterationPath);
    if (featureIds.length === 0) return [];

    const features = await this.batchFetchWorkItems(featureIds, true);

    const childIdToFeatureId = new Map<number, number>();
    for (const feature of features) {
      for (const rel of feature.relations ?? []) {
        if (rel.rel === CHILD_RELATION) {
          const childId = this.extractId(rel.url);
          if (childId !== null) childIdToFeatureId.set(childId, feature.id);
        }
      }
    }

    const storyIds = [...childIdToFeatureId.keys()];
    const storiesMap = new Map<number, WorkItem>();

    if (storyIds.length > 0) {
      const stories = await this.batchFetchWorkItems(storyIds, false);
      for (const s of stories) {
        if (s.fields['System.WorkItemType'] === 'User Story') {
          storiesMap.set(s.id, s);
        }
      }
    }

    return features.map(f => this.buildDTO(f, childIdToFeatureId, storiesMap));
  }

  async getAreaPaths(): Promise<string[]> {
    try {
      const res = await this.client.get(
        `/${this.project}/_apis/wit/classificationnodes/areas?$depth=10&api-version=7.0`
      );
      const paths: string[] = [];
      this.flattenPaths(res.data, '', paths);
      return paths.length ? paths : (loadConfig().areaPaths ?? [loadConfig().defaultAreaPath]);
    } catch {
      const config = loadConfig();
      return config.areaPaths ?? [config.defaultAreaPath];
    }
  }

  async getIterationPaths(): Promise<string[]> {
    try {
      const res = await this.client.get(
        `/${this.project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`
      );
      const paths: string[] = [];
      this.flattenPaths(res.data, '', paths);
      return paths.filter(p => p.split('\\').length >= 3);
    } catch {
      const config = loadConfig();
      return config.iterationPaths ?? [config.defaultIterationPath];
    }
  }

  async getSprintUpdateData(areaPath: string, iterationPath: string): Promise<SprintUpdateData> {
    // Fetch features and their child stories with relations
    const featureIds = await this.queryFeatureIds(areaPath, iterationPath);
    if (featureIds.length === 0) {
      return this.buildEmptySprintUpdateData(areaPath, iterationPath);
    }

    const features = await this.batchFetchWorkItems(featureIds, true);

    const childIdToFeatureId = new Map<number, number>();
    for (const feature of features) {
      for (const rel of feature.relations ?? []) {
        if (rel.rel === CHILD_RELATION) {
          const childId = this.extractId(rel.url);
          if (childId !== null) childIdToFeatureId.set(childId, feature.id);
        }
      }
    }

    const storyIds = [...childIdToFeatureId.keys()];
    const storiesMap = new Map<number, WorkItem>();
    const allDependencyIds = new Set<number>();

    if (storyIds.length > 0) {
      const stories = await this.batchFetchWorkItemsWithTags(storyIds);
      for (const s of stories) {
        if (s.fields['System.WorkItemType'] === 'User Story') {
          storiesMap.set(s.id, s);
          // Collect dependency IDs from relations
          for (const rel of s.relations ?? []) {
            if (
              rel.rel === 'System.LinkTypes.Dependency-Forward' ||
              rel.rel === 'System.LinkTypes.Dependency-Reverse'
            ) {
              const depId = this.extractId(rel.url);
              if (depId !== null) allDependencyIds.add(depId);
            }
          }
        }
      }
    }

    // Fetch dependency work items in batch
    const dependenciesMap = new Map<number, { title: string; state: string }>();
    if (allDependencyIds.size > 0) {
      const depIds = Array.from(allDependencyIds);
      const depWorkItems = await this.batchFetchWorkItems(depIds, false);
      for (const dep of depWorkItems) {
        dependenciesMap.set(dep.id, {
          title: dep.fields['System.Title'],
          state: dep.fields['System.State'],
        });
      }
    }

    // Get iteration details for sprint dates
    const iterationNode = await this.getIterationNode(iterationPath);
    const startDate = iterationNode?.attributes?.startDate;
    const finishDate = iterationNode?.attributes?.finishDate;

    // Compute week
    const computedWeek = computeWeek(startDate, finishDate);

    // Build feature rows
    const featureRows: SprintFeatureRow[] = [];
    let totalCommittedSp = 0;
    let totalQaDoneSp = 0;

    for (const feature of features) {
      const childStories: WorkItem[] = [];
      for (const [sid, fid] of childIdToFeatureId) {
        if (fid === feature.id && storiesMap.has(sid)) {
          childStories.push(storiesMap.get(sid)!);
        }
      }

      const row = this.buildSprintFeatureRow(
        feature,
        childStories,
        storiesMap,
        dependenciesMap
      );

      featureRows.push(row);
      totalCommittedSp += row.spTotal;
      totalQaDoneSp += row.spDoneQa;
    }

    const commitmentSp = totalCommittedSp;
    const targetWeek1Sp = calculateTargetWeek1Sp(commitmentSp);
    const qaDoneSp = totalQaDoneSp;
    const remainingSp = commitmentSp - qaDoneSp;

    // Compute summaries
    const blockedCount = featureRows.reduce((sum, row) => sum + row.blockers.length, 0);
    const dependencyCount = featureRows.reduce((sum, row) => sum + row.dependencies.length, 0);

    const week1: any = {
      commitmentSp,
      targetSp: targetWeek1Sp,
      qaDoneSp,
      qaDonePct: commitmentSp > 0 ? Math.round((qaDoneSp / commitmentSp) * 100) : 0,
      featuresInScope: featureRows.length,
      blockedCount,
    };

    const week2: any = {
      commitmentSp,
      targetSp: commitmentSp - targetWeek1Sp,
      qaDoneSp,
      qaDonePct: commitmentSp > 0 ? Math.round((qaDoneSp / commitmentSp) * 100) : 0,
      featuresInScope: featureRows.length,
      blockedCount,
    };

    const carryoverFeatures = featureRows.filter(row => row.spRemaining > 0);

    const postSprint: any = {
      totalCommittedSp: commitmentSp,
      deliveredSp: qaDoneSp,
      completionPct: commitmentSp > 0 ? Math.round((qaDoneSp / commitmentSp) * 100) : 0,
      carryoverFeatures,
      blockerSummary: blockedCount,
      dependencySummary: dependencyCount,
    };

    return {
      sprintName: iterationNode?.name ?? iterationPath,
      areaPath,
      iterationPath,
      startDate,
      finishDate,
      computedWeek,
      commitmentSp,
      targetWeek1Sp,
      qaDoneSp,
      remainingSp,
      week1,
      week2,
      postSprint,
      features: featureRows,
    };
  }

  private async batchFetchWorkItemsWithTags(ids: number[]): Promise<WorkItem[]> {
    const results: WorkItem[] = [];
    const fields =
      'System.Id,System.Title,System.WorkItemType,System.State,System.AreaPath,System.IterationPath,Microsoft.VSTS.Scheduling.StoryPoints,System.Tags';

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const query = `ids=${batch.join(',')}&$expand=relations&fields=${fields}&api-version=7.0`;
      const res = await this.client.get(
        `/${this.project}/_apis/wit/workitems?${query}`
      );
      results.push(...(res.data.value ?? []));
    }
    return results;
  }

  private async getIterationNode(iterationPath: string): Promise<any> {
    try {
      const res = await this.client.get(
        `/${this.project}/_apis/wit/classificationnodes/iterations/${iterationPath.replace(/\\/g, '%2F')}?api-version=7.0`
      );
      return res.data;
    } catch {
      return null;
    }
  }


  private buildSprintFeatureRow(
    feature: WorkItem,
    childStories: WorkItem[],
    storiesMap: Map<number, WorkItem>,
    dependenciesMap: Map<number, { title: string; state: string }>
  ): SprintFeatureRow {
    let spTotal = 0;
    let spDoneQa = 0;
    const allBlockers: BlockerInfo[] = [];
    const allDependencies: DependencyInfo[] = [];
    const seenDepIds = new Set<number>();

    for (const story of childStories) {
      const pts = story.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? 0;
      spTotal += pts;

      const stateStr = story.fields['System.State'] || '';
      const stateNorm = stateStr.toLowerCase();

      // Check if in past QA states
      if (PAST_QA_STATES.has(stateNorm)) {
        spDoneQa += pts;
      }

      // Check blockers: state === blocked OR tag contains 'blocked'
      if (stateNorm === 'blocked') {
        allBlockers.push({
          reason: `State is ${stateStr}`,
          source: 'state',
        });
      }

      const tags = this.parseTags(story.fields['System.Tags'] ?? '');
      if (tags.some(t => t.toLowerCase() === BLOCKED_TAG)) {
        allBlockers.push({
          reason: `Tagged as '${BLOCKED_TAG}'`,
          source: 'tag',
        });
      }

      // Collect dependencies from relations
      for (const rel of story.relations ?? []) {
        if (
          rel.rel === 'System.LinkTypes.Dependency-Forward' ||
          rel.rel === 'System.LinkTypes.Dependency-Reverse'
        ) {
          const depId = this.extractId(rel.url);
          if (depId !== null && !seenDepIds.has(depId)) {
            seenDepIds.add(depId);
            const depInfo = dependenciesMap.get(depId);
            if (depInfo) {
              const direction =
                rel.rel === 'System.LinkTypes.Dependency-Forward' ? 'forward' : 'reverse';
              allDependencies.push({
                id: depId,
                title: depInfo.title,
                state: depInfo.state,
                direction,
              });
            }
          }
        }
      }
    }

    const spRemaining = spTotal - spDoneQa;
    const NOT_STARTED_STATES = new Set([
      'new',
      'to do',
      'todo',
      'in analysis',
      'analysis',
      'ready for refine',
      'ready for refinement',
    ]);
    let spNotStarted = 0;
    for (const story of childStories) {
      const stateNorm = (story.fields['System.State'] || '').toLowerCase();
      if (NOT_STARTED_STATES.has(stateNorm)) {
        spNotStarted += story.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? 0;
      }
    }
    const spInProgress = spTotal - spDoneQa - spNotStarted;

    return {
      featureId: feature.id,
      featureTitle: feature.fields['System.Title'],
      featureState: feature.fields['System.State'],
      featureAdoUrl: `https://dev.azure.com/${this.organization}/${this.project}/_workitems/edit/${feature.id}`,
      tshirtSize: feature.fields['Microsoft.VSTS.Scheduling.Size'] ?? '',
      spInProgress,
      spRemaining,
      spTotal,
      spDoneQa,
      blockers: allBlockers,
      dependencies: allDependencies,
    };
  }

  private parseTags(tagsStr: string): string[] {
    if (!tagsStr) return [];
    return tagsStr.split(';').map(t => t.trim()).filter(t => t.length > 0);
  }

  private buildEmptySprintUpdateData(areaPath: string, iterationPath: string): SprintUpdateData {
    return {
      sprintName: iterationPath,
      areaPath,
      iterationPath,
      startDate: undefined,
      finishDate: undefined,
      computedWeek: 'week1',
      commitmentSp: 0,
      targetWeek1Sp: 0,
      qaDoneSp: 0,
      remainingSp: 0,
      week1: {
        commitmentSp: 0,
        targetSp: 0,
        qaDoneSp: 0,
        qaDonePct: 0,
        featuresInScope: 0,
        blockedCount: 0,
      },
      week2: {
        commitmentSp: 0,
        targetSp: 0,
        qaDoneSp: 0,
        qaDonePct: 0,
        featuresInScope: 0,
        blockedCount: 0,
      },
      postSprint: {
        totalCommittedSp: 0,
        deliveredSp: 0,
        completionPct: 0,
        carryoverFeatures: [],
        blockerSummary: 0,
        dependencySummary: 0,
      },
      features: [],
    };
  }

  private async queryFeatureIds(areaPath: string, iterationPath: string): Promise<number[]> {
    const query = [
      `SELECT [System.Id] FROM WorkItems`,
      `WHERE [System.WorkItemType] = 'Feature'`,
      `AND [System.AreaPath] UNDER '${areaPath}'`,
      `AND [System.IterationPath] = '${iterationPath}'`,
      `ORDER BY [System.Id]`,
    ].join(' ');

    const res = await this.client.post(
      `/${this.project}/_apis/wit/wiql?api-version=7.0`,
      { query }
    );
    return (res.data.workItems ?? []).map((wi: { id: number }) => wi.id);
  }

  private async batchFetchWorkItems(ids: number[], withRelations: boolean): Promise<WorkItem[]> {
    const results: WorkItem[] = [];
    const fields =
      'System.Id,System.Title,System.WorkItemType,System.State,System.AreaPath,System.IterationPath,Microsoft.VSTS.Scheduling.StoryPoints';

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      // ADO rejects requests that combine $expand and fields — mutually exclusive
      const query = withRelations
        ? `ids=${batch.join(',')}&$expand=relations&api-version=7.0`
        : `ids=${batch.join(',')}&fields=${fields}&api-version=7.0`;
      const res = await this.client.get(
        `/${this.project}/_apis/wit/workitems?${query}`
      );
      results.push(...(res.data.value ?? []));
    }
    return results;
  }

  private buildDTO(
    feature: WorkItem,
    childMap: Map<number, number>,
    storiesMap: Map<number, WorkItem>
  ): FeatureDTO {
    const stories: WorkItem[] = [];
    for (const [sid, fid] of childMap) {
      if (fid === feature.id && storiesMap.has(sid)) {
        stories.push(storiesMap.get(sid)!);
      }
    }

    const stateCounts: StateCount = { ...EMPTY_STATE_COUNT };
    let totalPoints = 0, donePoints = 0, activePoints = 0, blockedPoints = 0;

    const DONE_KEYS   = new Set<keyof StateCount>(['readyForProd', 'closed']);
    const ACTIVE_KEYS = new Set<keyof StateCount>(['inDevelopment','devComplete','readyForQA','sprintReady','inRefinement','readyForRefine','inAnalysis']);

    for (const s of stories) {
      const bucket = classifyState(s.fields['System.State']);
      if (bucket) stateCounts[bucket]++;
      const pts = s.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? 0;
      totalPoints += pts;
      if (bucket && DONE_KEYS.has(bucket))    donePoints    += pts;
      else if (bucket && ACTIVE_KEYS.has(bucket)) activePoints  += pts;
      else if (bucket === 'blocked')               blockedPoints += pts;
    }

    const total = stories.length;
    const doneCount = stateCounts.readyForProd + stateCounts.closed;
    const percentComplete = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    const userStories: UserStoryDTO[] = stories.map(s => ({
      id: s.id,
      title: s.fields['System.Title'],
      state: s.fields['System.State'],
    }));

    return {
      id: feature.id,
      title: feature.fields['System.Title'],
      state: feature.fields['System.State'],
      areaPath: feature.fields['System.AreaPath'],
      iterationPath: feature.fields['System.IterationPath'],
      totalStories: total,
      percentComplete,
      stateCounts,
      userStories,
      totalPoints,
      donePoints,
      activePoints,
      blockedPoints,
      tshirtSize: feature.fields['Microsoft.VSTS.Scheduling.Size'] ?? '',
      adoUrl: `https://dev.azure.com/${this.organization}/${this.project}/_workitems/edit/${feature.id}`,
    };
  }

  private flattenPaths(node: any, prefix: string, out: string[]): void {
    const current = prefix ? `${prefix}\\${node.name}` : node.name;
    if (prefix) out.push(current);
    for (const child of node.children ?? []) {
      this.flattenPaths(child, current, out);
    }
  }

  private extractId(url: string): number | null {
    const m = url.match(/\/(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  }
}

export const adoService = new AdoService();
