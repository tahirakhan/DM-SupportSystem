export interface TeamIteration {
  id: string;
  name: string;
  path: string;
  startDate?: string;
  finishDate?: string;
}

export interface TeamDTO {
  id: string;
  name: string;
  areaPath: string;
  defaultIterationPath: string;
  currentIteration: TeamIteration | null;
}
