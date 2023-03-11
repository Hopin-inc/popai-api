import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { valueOf } from "@/types/index";

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

export type INotionProperty = valueOf<Pick<PageObjectResponse, "properties">>;
