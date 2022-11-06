export type ICompany = {
  id: number;
  name: string;
  todoapps?: ITodoApp[];
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
  line_id: string;
  companyCondition?: ICompanyCondition[];
  todoAppUsers?: ITodoAppUser[];
};

export type ISection = {
  id: number;
  company_id: number | null;
  todoapp_id: number | null;
  board_id: string;
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
  todoapp_reg_created_by: number | null;
  todoapp_reg_created_at: Date | null;
  assigned_user_id: number | null;
  deadline: Date | null;
  is_done: boolean | null;
  is_reminded: boolean | null;
  is_rescheduled: boolean | null;
  reminded_count: number | null;
};

export type ITrelloTask = {
  id: string;
  name: string;
  dueComplete: boolean;
  dateLastActivity: Date;
  due: Date;
  dueReminder: number;
  shortUrl: string;
  url: string;
  idMembers: string[];
};

export type ITodoTask = {
  todoTask: ITrelloTask;
  todoappId: number;
  companyId: number;
  sectionId: number;
  user?: IUser;
};

export type ITrelloAuth = {
  api_key: string;
  api_token: string;
};

export type IMicrosoftStatus = {
  NOT_START: 'notStarted';
  COMPLETED: 'completed';
};

export type IMicrosoftDueDate = {
  dateTime: Date;
  timeZone: string;
};
export type IMicrosoftTask = {
  id: string;
  title: string;
  isReminderOn: boolean;
  createdDateTime: Date;
  status: string;
  lastModifiedDateTime?: Date;
  dueDateTime?: IMicrosoftDueDate;
};

export type IMicrosoftRefresh = {
  todoAppUser: ITodoAppUser;
};

export type IRemindTask = {
  remindDays: number;
  cardTodo: ITodoTask;
};
