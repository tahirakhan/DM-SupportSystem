import axios, { AxiosInstance } from 'axios';
import { loadConfig } from '../config/config';
import { WorkItem, UserStoryDTO } from '../models/work-item.model';
import { FeatureDTO, StateCount, EMPTY_STATE_COUNT } from '../models/feature.model';
import {
  SprintNode, SprintSummary, FeatureSprintCell,
  PiFeatureRow, PiSummary, BurnupPoint, PiData,
} from '../models/pi.model';

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

const DONE_KEYS   = new Set<keyof StateCount>(['readyForProd', 'closed']);
const ACTIVE_KEYS = new Set<keyof StateCount>([
  'inDevelopment', 'devComplete', 'readyForQA', 'sprintReady',
  'inRefinement', 'readyForRefine', 'inAnalysis',
]);
const BATCH_SIZE = 200;
const CHILD_RELATION = 'System.LinkTypes.Hierarchy-Forward';

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
      timeout: 60_000,
    });
  }

  // ── Existing: features for sprint-level iteration ──────────────────────────

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
        if (
          s.fields['System.WorkItemType'] === 'User Story' &&
          s.fields['System.State']?.toLowerCase() !== 'removed'
        ) {
          storiesMap.set(s.id, s);
        }
      }
    }

    return features.map(f => this.buildDTO(f, childIdToFeatureId, storiesMap));
  }

  // ── New: PI-level dashboard data ───────────────────────────────────────────

  async getPiData(areaPath: string, piIterationPath: string): Promise<PiData> {
    const sprintNodes = await this.getChildIterations(piIterationPath);

    const featureIds = await this.queryFeaturesUnder(areaPath, piIterationPath);
    if (featureIds.length === 0) {
      return this.emptyPiData(piIterationPath, areaPath, sprintNodes);
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
    if (storyIds.length > 0) {
      const stories = await this.batchFetchWorkItems(storyIds, false);
      for (const s of stories) {
        if (
          s.fields['System.WorkItemType'] === 'User Story' &&
          s.fields['System.State']?.toLowerCase() !== 'removed'
        ) {
          storiesMap.set(s.id, s);
        }
      }
    }

    // Group stories by sprint path
    const sprintStoriesMap = new Map<string, WorkItem[]>();
    for (const node of sprintNodes) sprintStoriesMap.set(node.path, []);

    for (const story of storiesMap.values()) {
      const sp = story.fields['System.IterationPath'];
      if (sprintStoriesMap.has(sp)) {
        sprintStoriesMap.get(sp)!.push(story);
      }
    }

    const sprints: SprintSummary[] = sprintNodes.map(node =>
      this.buildSprintSummary(node, sprintStoriesMap.get(node.path) ?? [])
    );

    const piFeatureRows: PiFeatureRow[] = features.map(f =>
      this.buildPiFeatureRow(f, childIdToFeatureId, storiesMap, sprintNodes)
    );
    piFeatureRows.sort((a, b) => b.totalStories - a.totalStories);

    const allStories = [...storiesMap.values()];
    const summary = this.buildPiSummary(features, allStories, sprintNodes.length, piFeatureRows);
    const burnup = this.buildBurnup(sprints);

    const parts = piIterationPath.split('\\');
    const piName = parts[parts.length - 1];

    return { piName, areaPath, iterationPath: piIterationPath, sprints, features: piFeatureRows, summary, burnup };
  }

  // ── Path methods ───────────────────────────────────────────────────────────

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

  async getPiIterationPaths(): Promise<string[]> {
    try {
      const res = await this.client.get(
        `/${this.project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`
      );
      const paths: string[] = [];
      this.flattenPaths(res.data, '', paths);
      // PI-level: paths with exactly 2 segments (Project\PI-name)
      // but also include depth-3 paths in case the project has a different hierarchy
      return paths.filter(p => p.split('\\').length === 2);
    } catch {
      return [];
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getChildIterations(piIterationPath: string): Promise<SprintNode[]> {
    try {
      const res = await this.client.get(
        `/${this.project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`
      );
      const parts = piIterationPath.split('\\');
      let node = res.data;
      // Navigate: root.name === parts[0], then follow children by name
      for (let i = 1; i < parts.length; i++) {
        node = (node.children ?? []).find((c: any) => c.name === parts[i]);
        if (!node) return [];
      }
      return (node.children ?? []).map((child: any) => ({
        name: child.name,
        path: `${piIterationPath}\\${child.name}`,
        startDate: child.attributes?.startDate,
        finishDate: child.attributes?.finishDate,
      }));
    } catch {
      return [];
    }
  }

  private async queryFeatureIds(areaPath: string, iterationPath: string): Promise<number[]> {
    const query = [
      `SELECT [System.Id] FROM WorkItems`,
      `WHERE [System.WorkItemType] = 'Feature'`,
      `AND [System.State] <> 'Removed'`,
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

  private async queryFeaturesUnder(areaPath: string, piIterationPath: string): Promise<number[]> {
    const query = [
      `SELECT [System.Id] FROM WorkItems`,
      `WHERE [System.WorkItemType] = 'Feature'`,
      `AND [System.State] <> 'Removed'`,
      `AND [System.AreaPath] UNDER '${areaPath}'`,
      `AND [System.IterationPath] UNDER '${piIterationPath}'`,
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
      iterationPath: s.fields['System.IterationPath'],
      storyPoints: s.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? 0,
      adoUrl: `https://dev.azure.com/${this.organization}/${this.project}/_workitems/edit/${s.id}`,
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

  private buildSprintSummary(node: SprintNode, stories: WorkItem[]): SprintSummary {
    let doneStories = 0, activeStories = 0, blockedStories = 0, notStartedStories = 0;
    let totalPoints = 0, donePoints = 0;

    for (const s of stories) {
      const bucket = classifyState(s.fields['System.State']);
      const pts = s.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? 0;
      totalPoints += pts;

      if (bucket && DONE_KEYS.has(bucket))         { doneStories++;   donePoints += pts; }
      else if (bucket === 'blocked')               { blockedStories++; }
      else if (bucket && ACTIVE_KEYS.has(bucket))  { activeStories++; }
      else                                         { notStartedStories++; }
    }

    const total = stories.length;
    const percentComplete = total > 0 ? Math.round((doneStories / total) * 100) : 0;

    let status: SprintSummary['status'];
    if (percentComplete === 100 && total > 0) status = 'complete';
    else if (percentComplete >= 50)           status = 'on-track';
    else if (total > 0)                      status = 'at-risk';
    else                                      status = 'not-started';

    return {
      name: node.name,
      path: node.path,
      startDate: node.startDate,
      finishDate: node.finishDate,
      totalStories: total,
      doneStories,
      activeStories,
      blockedStories,
      notStartedStories,
      totalPoints,
      donePoints,
      percentComplete,
      status,
    };
  }

  private buildPiFeatureRow(
    feature: WorkItem,
    childMap: Map<number, number>,
    storiesMap: Map<number, WorkItem>,
    sprintNodes: SprintNode[]
  ): PiFeatureRow {
    const stories: WorkItem[] = [];
    for (const [sid, fid] of childMap) {
      if (fid === feature.id && storiesMap.has(sid)) {
        stories.push(storiesMap.get(sid)!);
      }
    }

    const sprintCells: { [sprintPath: string]: FeatureSprintCell } = {};
    for (const node of sprintNodes) {
      sprintCells[node.path] = { total: 0, done: 0, points: 0, donePoints: 0 };
    }

    let totalStories = 0, doneStories = 0, totalPoints = 0, donePoints = 0;

    for (const s of stories) {
      const sprintPath = s.fields['System.IterationPath'];
      const pts = s.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? 0;
      const bucket = classifyState(s.fields['System.State']);
      const isDone = bucket !== null && DONE_KEYS.has(bucket);

      totalStories++;
      totalPoints += pts;
      if (isDone) { doneStories++; donePoints += pts; }

      if (sprintCells[sprintPath]) {
        sprintCells[sprintPath].total++;
        sprintCells[sprintPath].points += pts;
        if (isDone) { sprintCells[sprintPath].done++; sprintCells[sprintPath].donePoints += pts; }
      }
    }

    const percentComplete = totalStories > 0 ? Math.round((doneStories / totalStories) * 100) : 0;

    return {
      featureId: feature.id,
      featureTitle: feature.fields['System.Title'],
      featureState: feature.fields['System.State'],
      featureAdoUrl: `https://dev.azure.com/${this.organization}/${this.project}/_workitems/edit/${feature.id}`,
      tshirtSize: feature.fields['Microsoft.VSTS.Scheduling.Size'] ?? '',
      totalStories,
      doneStories,
      totalPoints,
      donePoints,
      percentComplete,
      sprints: sprintCells,
    };
  }

  private buildPiSummary(
    features: WorkItem[],
    allStories: WorkItem[],
    totalSprints: number,
    featureRows: PiFeatureRow[]
  ): PiSummary {
    let totalStories = 0, doneStories = 0, totalPoints = 0, donePoints = 0, blockedStories = 0;

    for (const s of allStories) {
      const bucket = classifyState(s.fields['System.State']);
      const pts = s.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? 0;
      totalStories++;
      totalPoints += pts;
      if (bucket && DONE_KEYS.has(bucket)) { doneStories++; donePoints += pts; }
      if (bucket === 'blocked') blockedStories++;
    }

    const featuresWithStories = featureRows.filter(f => f.totalStories > 0).length;

    return {
      totalFeatures: features.length,
      featuresWithStories,
      totalStories,
      doneStories,
      totalPoints,
      donePoints,
      blockedStories,
      completionPct: totalStories > 0 ? Math.round((doneStories / totalStories) * 100) : 0,
      pointsPct: totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0,
      totalSprints,
    };
  }

  private buildBurnup(sprints: SprintSummary[]): BurnupPoint[] {
    const totalStories = sprints.reduce((s, sp) => s + sp.totalStories, 0);
    const totalPoints  = sprints.reduce((s, sp) => s + sp.totalPoints, 0);
    let cumDoneStories = 0, cumDonePoints = 0;

    return sprints.map(sp => {
      cumDoneStories += sp.doneStories;
      cumDonePoints  += sp.donePoints;
      return {
        sprintName:   sp.name,
        doneStories:  cumDoneStories,
        donePoints:   cumDonePoints,
        totalStories,
        totalPoints,
      };
    });
  }

  private emptyPiData(piIterationPath: string, areaPath: string, sprints: SprintNode[]): PiData {
    const parts = piIterationPath.split('\\');
    return {
      piName: parts[parts.length - 1],
      areaPath,
      iterationPath: piIterationPath,
      sprints: sprints.map(n => ({
        name: n.name, path: n.path,
        startDate: n.startDate, finishDate: n.finishDate,
        totalStories: 0, doneStories: 0, activeStories: 0,
        blockedStories: 0, notStartedStories: 0,
        totalPoints: 0, donePoints: 0, percentComplete: 0,
        status: 'not-started',
      })),
      features: [],
      summary: {
        totalFeatures: 0, featuresWithStories: 0,
        totalStories: 0, doneStories: 0,
        totalPoints: 0, donePoints: 0, blockedStories: 0,
        completionPct: 0, pointsPct: 0, totalSprints: sprints.length,
      },
      burnup: [],
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
