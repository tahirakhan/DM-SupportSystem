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
