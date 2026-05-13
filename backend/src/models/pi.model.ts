export interface SprintNode {
  name: string;
  path: string;
  startDate?: string;
  finishDate?: string;
}

export interface SprintSummary {
  name: string;
  path: string;
  startDate?: string;
  finishDate?: string;
  totalStories: number;
  doneStories: number;
  activeStories: number;
  blockedStories: number;
  notStartedStories: number;
  totalPoints: number;
  donePoints: number;
  percentComplete: number;
  status: 'complete' | 'on-track' | 'at-risk' | 'not-started';
}

export interface FeatureSprintCell {
  total: number;
  done: number;
  points: number;
  donePoints: number;
}

export interface PiFeatureRow {
  featureId: number;
  featureTitle: string;
  featureState: string;
  featureAdoUrl: string;
  tshirtSize: string;
  totalStories: number;
  doneStories: number;
  totalPoints: number;
  donePoints: number;
  percentComplete: number;
  sprints: { [sprintPath: string]: FeatureSprintCell };
}

export interface PiSummary {
  totalFeatures: number;
  featuresWithStories: number;
  totalStories: number;
  doneStories: number;
  totalPoints: number;
  donePoints: number;
  blockedStories: number;
  completionPct: number;
  pointsPct: number;
  totalSprints: number;
}

export interface BurnupPoint {
  sprintName: string;
  doneStories: number;
  donePoints: number;
  totalStories: number;
  totalPoints: number;
}

export interface PiData {
  piName: string;
  areaPath: string;
  iterationPath: string;
  sprints: SprintSummary[];
  features: PiFeatureRow[];
  summary: PiSummary;
  burnup: BurnupPoint[];
}
