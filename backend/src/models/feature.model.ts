import { UserStoryDTO } from './work-item.model';

export interface StateCount {
  new: number;
  inAnalysis: number;
  readyForRefine: number;
  inRefinement: number;
  sprintReady: number;
  inDevelopment: number;
  devComplete: number;
  readyForQA: number;
  readyForProd: number;
  closed: number;
  blocked: number;
}

export const EMPTY_STATE_COUNT: StateCount = {
  new: 0, inAnalysis: 0, readyForRefine: 0, inRefinement: 0,
  sprintReady: 0, inDevelopment: 0, devComplete: 0,
  readyForQA: 0, readyForProd: 0, closed: 0, blocked: 0,
};

export interface FeatureDTO {
  id: number;
  title: string;
  state: string;
  areaPath: string;
  iterationPath: string;
  totalStories: number;
  percentComplete: number;
  stateCounts: StateCount;
  userStories: UserStoryDTO[];
  totalPoints: number;
  donePoints: number;
  activePoints: number;
  blockedPoints: number;
  tshirtSize: string;
  adoUrl: string;
}
