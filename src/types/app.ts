import { NotionPropertyType } from "@/consts/common";

export type ISelectItem<IDType = number> = {
  id: IDType;
  name: string;
};

export type IChatToolInfo = {
  chatToolId: number;
  teamId: string;
};

export type ITodoAppInfo = {
  todoAppId: number;
  workspaceId: string;
};

export type IProperty = ISelectItem<string> & {
  type: PropertyType;
  availableOptions?: (ISelectItem<string> & Record<string, any>)[];
};

export type PropertyType = typeof NotionPropertyType | 0;

export type IPropertyUsage = {
  id: number;
  property: string;
  usage: number;
  type: number;
  options?: string[];
  isChecked?: boolean;
};

export type IUserConfig = {
  user: ISelectItem<string>;
  chatToolUserId: string;
  todoAppUserId: string;
};

export type IUserReportingLine = {
  user: ISelectItem<string>;
  superiorUsers: string[];
};

export type IConfigCommon = {
  daysOfWeek: number[];
  disabledOnHolidaysJp:  boolean;
  excludedDates: string[];
};

export type IConfigProspect = {
  type: number;
  enabled: boolean;
  chatToolId: number;
  channel: string;
  from: number;
  to: number;
  fromDaysBefore: number;
  beginOfWeek: number;
  frequency: number;
  frequencyDaysBefore: number[];
  timings: IConfigProspectTiming[];
};

export type IConfigProspectTiming = {
  time: string;
  mode: number;
};

export type IConfigFeatures = {
  projects: boolean;
  todos: boolean;
};

export type IBoardConfig = {
  boardId?: string;
  projectRule?: number;
};
