export type WeekView = 'week1' | 'week2' | 'postSprint';

export interface BlockerInfo {
  reason: string;
  source: 'tag' | 'state';
}

export interface DependencyInfo {
  id: number;
  title: string;
  state: string;
  direction: 'forward' | 'reverse';
}

export interface SprintFeatureRow {
  featureId: number;
  featureTitle: string;
  featureState: string;
  featureAdoUrl: string;
  tshirtSize: string;
  spInProgress: number;
  spRemaining: number;
  spTotal: number;
  spDoneQa: number;
  blockers: BlockerInfo[];
  dependencies: DependencyInfo[];
}

export interface WeeklySummary {
  commitmentSp: number;
  targetSp: number;
  qaDoneSp: number;
  qaDonePct: number;
  featuresInScope: number;
  blockedCount: number;
}

export interface PostSprintSummary {
  totalCommittedSp: number;
  deliveredSp: number;
  completionPct: number;
  carryoverFeatures: SprintFeatureRow[];
  blockerSummary: number;
  dependencySummary: number;
}

export interface SprintUpdateData {
  sprintName: string;
  areaPath: string;
  iterationPath: string;
  startDate?: string;
  finishDate?: string;
  computedWeek: WeekView;
  commitmentSp: number;
  targetWeek1Sp: number;
  qaDoneSp: number;
  remainingSp: number;
  week1: WeeklySummary;
  week2: WeeklySummary;
  postSprint: PostSprintSummary;
  features: SprintFeatureRow[];
}
