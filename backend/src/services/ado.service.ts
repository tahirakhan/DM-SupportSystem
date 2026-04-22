import axios, { AxiosInstance } from 'axios';
import { loadConfig } from '../config/config';
import { WorkItem, UserStoryDTO } from '../models/work-item.model';
import { FeatureDTO, StateCount, EMPTY_STATE_COUNT } from '../models/feature.model';

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
