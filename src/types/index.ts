import ChatTool from "@/entities/ChatTool";
import LineMessageQueue from "@/entities/LineMessageQueue";

import { ITrelloTask } from "@/types/trello";
import { IMicrosoftTask } from "@/types/microsoft";
import { INotionTask } from "@/types/notion";

export type valueOf<T> = T[keyof T];

export type ICompany = {
  id: number;
  name: string;
  admin_user_id: number;
  todoapps?: ITodoApp[];
  adminUser?: IUser;
  is_demo: boolean;
  companyConditions?: ICompanyCondition[];
  chattools: ChatTool[];
  todos?: ITodo[];
  users: IUser[];
};

export type ITodoApp = {
  id: number;
  name: string;
  todo_app_code: string;
};

export type ICompanyCondition = {
  remind_before_days: number;
};

export type IUser = {
  id: number;
  name: string;
  line_id?: string;
  slack_id?: string;
  companyCondition?: ICompanyCondition[];
  todoAppUsers?: ITodoAppUser[];
};

export type ISection = {
  id: number;
  company_id: number | null;
  todoapp_id: number | null;
  board_id: string;
  channel_id: string | null;
  boardAdminUser: IUser;
};

export type ITodoSection = {
  todo_id: number;
  section_id: number;
  created_at: Date;
  deleted_at: Date;
}

export type ITodoAppUser = {
  employee_id: number | null;
  todoapp_id: number | null;
  user_app_id: string;
  api_key: string;
  api_token: string;
  refresh_token: string;
  expires_in: number;
};

export type ITodo = {
  id: number;
  name: string;
  todoapp_id: number;
  todoapp_reg_id: string | null;
  todoapp_reg_url: string | null;
  todoapp_reg_created_by: number | null;
  todoapp_reg_created_at: Date | null;
  company_id: number;
  deadline: Date | null;
  is_done: boolean | null;
  is_reminded: boolean | null;
  delayed_count: number;
  is_closed: boolean;
  reminded_count: number | null;
  first_ddl_set_at: Date | null;
  first_assigned_at: Date | null;
  todoSections: ITodoSection[];
  todoUsers: ITodoUser[];
  user?: IUser;
  assigned_user_id?: number | null;
};

export type ITodoUser = {
  todo_id: number;
  user_id: number;
  created_at: Date;
  deleted_at: Date;
  todo: ITodo;
  user: IUser;
};

export type ITodoUpdate = {
  todoId: string;
  dueTime?: Date;
  newDueTime: Date;
  newIsDone?: boolean;
  updateTime: Date;
};

export type ITodoUserUpdate = {
  todoId: string;
  users: IUser[];
};

export type ITodoSectionUpdate = {
  todoId: string;
  sections: ISection[];
}

export type IChatTool = {
  id: number;
  name: string;
  tool_code: string;
};

export type IChatToolUser = {
  auth_key: string;
  user_id: number;
  chattool_id: number;
};

export type ITask = ITrelloTask | IMicrosoftTask | INotionTask;

export type ITodoTask<T extends ITask> = {
  todoTask: T;
  todoapp: ITodoApp;
  todoAppUser: ITodoAppUser;
  company: ICompany;
  sections: ISection[];
  users?: IUser[];
};

export type IRemindType = {
  remindType: number;
  remindDays?: number;
};

export type IRemindTask<T extends ITask> = {
  remindDays: number;
  cardTodo: ITodoTask<T>;
  delayedCount: number;
};

export type ITodoLines = {
  todo: ITodo;
  remindDays: number;
  chattool: IChatTool;
  user: IUser;
  todoQueueTask?: LineMessageQueue;
};

export type ITodoQueue = {
  todoId: string;
  userId: number;
};

export type ITodoRemind = {
  remindDays: number;
  todoTask: ITodo;
};

export type IColumnName = {
  label_assignee: string | null;
  section_id: number;
  label_created_at: string | null;
  label_due: string | null;
  label_section: string | null;
  id: number;
  label_is_done: string | null;
  label_is_archived: string | null;
  label_todo: string | null;
}

export type ISectionLabel = {
  id: number;
  section_id: number;
  label_id: string;
  name: string;
}
