import { ChatTool } from '../entify/chat_tool.entity';
import { LineMessageQueue } from './../entify/line_message_queue.entity';

export type ICompany = {
  id: number;
  name: string;
  admin_user_id: number;
  todoapps?: ITodoApp[];
  admin_user?: IUser;
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
  companyCondition?: ICompanyCondition[];
  todoAppUsers?: ITodoAppUser[];
};

export type ISection = {
  id: number;
  company_id: number | null;
  todoapp_id: number | null;
  board_id: string;
  boardAdminUser: IUser;
};

export type ITodoAppUser = {
  id: number;
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
  section_id: number;
  deadline: Date | null;
  is_done: boolean | null;
  is_reminded: boolean | null;
  delayed_count: number;
  is_closed: boolean;
  reminded_count: number | null;
  first_ddl_set_at: Date | null;
  first_assigned_at: Date | null;
  todoUsers: ITodoUser[];
  user?: IUser;
  assigned_user_id?: number | null;
};

export type ITodoUser = {
  id: number;
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
  updateTime: Date;
};

export type ITodoUserUpdate = {
  todoId: string;
  users: IUser[];
};

export type IChatTool = {
  id: number;
  name: string;
  tool_code: string;
};

export type IChatToolUser = {
  id: number;
  auth_key: string;
  user_id: number;
  chattool_id: number;
};

export type ITrelloTask = {
  id: string;
  name: string;
  closed: boolean;
  dueComplete: boolean;
  dateLastActivity: Date;
  due: Date;
  dueReminder: number;
  shortUrl: string;
  url: string;
  idMembers: string[];
};

export type ITodoTask = {
  todoTask: ITrelloTask & IMicrosoftTask & INotionTask; // TODO:&を|に変える
  todoapp: ITodoApp;
  todoAppUser: ITodoAppUser;
  company: ICompany;
  section: ISection;
  users?: IUser[];
};

export type ITrelloAuth = {
  api_key: string;
  api_token: string;
};

export type IMicrosoftStatus = {
  NOT_START: 'notStarted';
  COMPLETED: 'completed';
};

export type IMicrosoftCreateBy = {
  user: {
    id: string;
  };
};

export type IMicrosoftAssignedBy = IMicrosoftCreateBy;

export type IMicrosoftAssign = {
  assignedBy: IMicrosoftAssignedBy;
};

export type IMicrosoftTask = {
  id: string;
  title: string;
  planId: string;
  percentComplete: number;
  createdDateTime: Date;
  dueDateTime?: Date;
  completedDateTime?: Date;
  createdBy?: IMicrosoftCreateBy;
  assignments: [IMicrosoftAssign];
  userCreateBy?: number | null;
};

export type IMicrosoftRefresh = {
  todoAppUser: ITodoAppUser;
};

export type IRemindType = {
  remindType: number;
  remindDays?: number;
};

export type IRemindTask = {
  remindDays: number;
  cardTodo: ITodoTask;
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
  assignee: string | null;
  board_id: number;
  created_at: string | null;
  created_by: string | null;
  due: string | null;
  section: string | null;
  id: number;
  is_done: string | null;
  todo: string | null;
}

export type INotionTask = {
  last_edited_at: Date;
  created_by: string;
  created_by_id: number;
  closed: boolean;
  deadline: Date;
  dueReminder: number | null;
  is_done: boolean;
  name: string;
  section: string[] | null;
  section_id: number[] | null;
  notion_user_id: string[];
  todoapp_reg_id: string;
  todoapp_reg_url: string;
}

export type ILabelSection = {
  id: number;
  board_id: number;
  label_id: string;
  name: string;
}