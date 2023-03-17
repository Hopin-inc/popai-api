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

export type IUserConfig = {
  user: ISelectItem;
  chatToolUserId: string;
  todoAppUserId: string;
}
