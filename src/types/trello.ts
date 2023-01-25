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

export type ITrelloAuth = {
  api_key: string;
  api_token: string;
};

export type ITrelloMember = Record<string, any> & {
  id: string;
}

export type IMicrosoftStatus = {
  NOT_START: "notStarted";
  COMPLETED: "completed";
};

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
  [key: string]: unknown;
}
