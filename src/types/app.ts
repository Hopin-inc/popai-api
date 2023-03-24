import { NotionPropertyType, UsageType } from "@/consts/common";
import { ValueOf } from "@/types/index";

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

export type IPropertyUsage = {
  id: number;
  property: string;
  usage: ValueOf<typeof UsageType>;
  type: ValueOf<typeof NotionPropertyType>;
  options?: string[];
  isChecked?: boolean;
};

export type IUserConfig = {
  user: ISelectItem;
  chatToolUserId: string;
  todoAppUserId: string;
};

export type IUserReportingLine = {
  user: ISelectItem;
  superiorUsers: number[];
};

export type IConfigCommon = {
  daysOfWeek: number[];
  disabledOnHolidaysJp:  boolean;
  excludedDates: string[];
};

export type IConfigDailyReport = {
  enabled: boolean;
  chatToolId: number;
  channel: string;
  timings: IConfigDailyReportTiming[];
};

export type IConfigDailyReportTiming = {
  time: string;
  enablePending: boolean;
};

export type IConfigNotify = {
  enabled: boolean;
  chatToolId: number;
  channel: string;
};

export type IConfigProspect = {
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
  askPlan: boolean;
  askPlanMilestone?: string;
};
