import { ChatTool } from '../entify/chat_tool.entity';
import { LineMessageQueue } from '../entify/line_message_queue.entity';
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

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

export type ITrelloTask = {
  id: string;
  name: string;
  idList: string;
  closed: boolean;
  dueComplete: boolean;
  dateLastActivity: Date;
  due: Date;
  dueReminder: number;
  shortUrl: string;
  url: string;
  idMembers: string[];
  idMemberCreator?: string;
  createdAt?: Date;
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

export type ITrelloAuth = {
  api_key: string;
  api_token: string;
};

export type ITrelloMember = Record<string, any> & {
  id: string;
}

export type IMicrosoftStatus = {
  NOT_START: 'notStarted';
  COMPLETED: 'completed';
};

export type IMicrosoftCreateBy = {
  user: IMicrosoftMember;
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

export type IMicrosoftToken = {
  token_type: string;
  score: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export type IMicrosoftMember = Record<string, any> & {
  id: string;
}

export type IMicrosoftErrorResponse = {
  error: {
    code: string;
    message: string;
    innerError: {
      requestId: string;
      date: string;
    };
  };
}

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

export type ITodoSlack = {
  todo: ITodo;
  remindDays: number;
  chatTool: IChatTool;
  user: IUser;
};

export type ITodoQueue = {
  todoId: string;
  userId: number;
};

export type ITodoRemind = {
  remindDays: number;
  todoTask: ITodo;
};

export type ISlackPostResponse = {
  ok: boolean;
  channel: string;
  ts: string;
}

export type ISlackActionResponse = {
  type: string;
  user: ISlackUser;
  container: ISlackContainer;
  message: ISlackMessage;
  response_url: string;
  actions: ISlackActions;
}

export type ISlackUser = {
  id: string;
  username: string;
  team_id: string;
}

export type ISlackContainer = {
  type: string;
  message_ts: string;
  attachment_id: number;
  channel_id: string;
  is_ephemeral: boolean;
  is_app_unfurl: boolean;
}

export type ISlackActions = {
  action_id: string;
  block_id: string;
  action_ts: string;
}

export type ISlackMessage = {
  text: string;
}

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

export type INotionTask = {
  last_edited_at: Date;
  created_by: string;
  created_by_id: number;
  closed: boolean;
  deadline: Date;
  dueReminder: number | null;
  is_done: boolean;
  name: string;
  sections: string[];
  section_ids: number[];
  notion_user_id: string[];
  todoapp_reg_id: string;
  todoapp_reg_url: string;
}

export type ISectionLabel = {
  id: number;
  section_id: number;
  label_id: string;
  name: string;
}

export type INotionProperty = valueOf<Pick<PageObjectResponse, "properties">>;

export type ITrelloList = {
  id: string;
  name: string;
  closed: boolean;
  idBoard: string;
  pos: number;
  subscribed: boolean;
  softLimit: any;
}

export type ITrelloActivityLog = {
  idMemberCreator: string;
  data: {
    card?: {
      closed: boolean;
      id: string;
      name: string;
      idShort: number;
      shortLink: string;
    };
    old?: {
      closed: boolean;
    };
    board?: {
      id: string;
      name: string;
      shortLink: string;
    };
    list?: {
      id: string;
      name: string;
    };
  }
  type: string;
  date: Date;
  [key: string]: any;
}
