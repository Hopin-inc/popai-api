import { ChatToolId, NotionPropertyType, TodoAppId, UsageType } from "@/consts/common";
import { ValueOf } from "@/types/index";

export type ISelectItem<IDType = number> = {
  id: IDType;
  name: string;
};

export type IChatToolInfo = {
  chatToolId: ValueOf<typeof ChatToolId>;
  teamId: string;
};

export type ITodoAppInfo = {
  todoAppId: ValueOf<typeof TodoAppId>;
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
  usage: ValueOf<typeof UsageType>;
  type: ValueOf<typeof NotionPropertyType>;
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
  enabled: boolean;
  chatToolId: ValueOf<typeof ChatToolId>;
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
  askPlan: boolean;
  askPlanMilestone?: string;
};

export type IConfigFeatures = {
  prospect: boolean;
};
