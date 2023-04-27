import { ValueOf } from "@/types/index";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export type INotionTask = {
  name: string;
  assignees: string[];
  startDate: Date;
  deadline: Date;
  sectionIds: number[];
  isDone: boolean;
  isClosed: boolean;
  deadlineReminder: number | null;
  todoAppRegId: string;
  todoAppRegUrl: string;
  createdAt: Date;
  createdBy: string;
  createdById: string;
  lastEditedAt: Date;
  lastEditedBy: string;
  lastEditedById: string;
}

export type INotionOAuthToken = {
  access_token: string;
  bot_id: string;
  duplicated_template_id?: string;
  owner: object;
  workspace_icon?: string;
  workspace_id: string;
  workspace_name?: string;
};

export type INotionPropertyInfo = ValueOf<PageObjectResponse["properties"]>;
