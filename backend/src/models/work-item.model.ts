export interface WorkItemFields {
  'System.Id': number;
  'System.Title': string;
  'System.WorkItemType': string;
  'System.State': string;
  'System.AreaPath': string;
  'System.IterationPath': string;
  'Microsoft.VSTS.Scheduling.StoryPoints'?: number;
  'Microsoft.VSTS.Scheduling.Size'?: string;
  'System.Tags'?: string;
}

export interface WorkItemRelation {
  rel: string;
  url: string;
  attributes: {
    name: string;
    isLocked?: boolean;
  };
}

export interface WorkItem {
  id: number;
  fields: WorkItemFields;
  relations?: WorkItemRelation[];
}

export interface UserStoryDTO {
  id: number;
  title: string;
  state: string;
}
