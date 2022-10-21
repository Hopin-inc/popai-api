export type ICompany = {
  id: number;
  name: string;
  todoapps?: ITodoApp[];
};

export type ITodoApp = {
  id: number;
  name: string;
};

export type IUser = {
  id: number;
  name: string;
  todoAppUsers?: ITodoAppUser[];
};

export type ITodoAppUser = {
  api_key: string;
  api_token: string;
  refresh_token: string;
  expires_in: number;
};
