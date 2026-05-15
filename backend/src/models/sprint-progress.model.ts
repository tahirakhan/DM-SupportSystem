export interface SprintMeta {
  id: string;
  name: string;
  path: string;
  startDate?: string;
  finishDate?: string;
  daysRemaining: number;
  percentElapsed: number;
}

export interface TeamMeta {
  id: string;
  name: string;
  areaPath: string;
}

export interface SprintSummary {
  totalSp: number;
  doneSp: number;
  totalItems: number;
  doneItems: number;
  pctCompleteBySp: number;
  pctCompleteByCount: number;
}

export type StateBucket = 'New' | 'Active' | 'Resolved' | 'Closed' | 'Blocked' | 'Other';

export interface StateBreakdown {
  state: StateBucket;
  sp: number;
  count: number;
}

export interface BurndownPoint {
  day: string; // ISO date
  sp: number;
}

export interface Burndown {
  ideal: BurndownPoint[];
  actualToday: BurndownPoint;
}

export interface ScopeChangeItem {
  id: number;
  title: string;
  sp: number;
  addedOn: string;
}

export interface AtRiskItem {
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  daysSinceUpdate: number;
  reason: 'no-updates' | 'late-active';
}

export interface BlockedItem {
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  source: 'tag' | 'state';
}

export interface SprintProgressData {
  sprint: SprintMeta;
  team: TeamMeta;
  summary: SprintSummary;
  stateBreakdown: StateBreakdown[];
  burndown: Burndown;
  scopeChange: { addedAfterStart: ScopeChangeItem[] };
  atRiskItems: AtRiskItem[];
  blockedItems: BlockedItem[];
  meta: { cached: boolean; cachedAt?: string };
}
