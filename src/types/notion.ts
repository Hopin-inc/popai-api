import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { ValueOf } from "@/types/index";

export type INotionTask = {
  name: string;
  assignees: string[];
  deadline: Date;
  sections: string[];
  sectionIds: number[];
  isDone: boolean;
  isClosed: boolean;
  deadlineReminder: number | null;
  todoappRegId: string;
  todoappRegUrl: string;
  createdAt: Date;
  createdBy: string;
  createdById: number;
  lastEditedAt: Date;
  lastEditedBy: string;
  lastEditedById: number;
}

export type INotionDailyReport = {
  pageId: string,
  docAppRegUrl: string,
  assignee: string,
}

export type INotionProperty = ValueOf<Pick<PageObjectResponse, "properties">>;

export type INotionOAuthToken = {
  access_token: string;
  bot_id: string;
  duplicated_template_id?: string;
  owner: object;
  workspace_icon?: string;
  workspace_id: string;
  workspace_name?: string;
};
