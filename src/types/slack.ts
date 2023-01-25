import { IChatTool, ITodo, IUser } from "@/types/index";

export type ITodoSlack = {
  todo: ITodo;
  remindDays: number;
  chatTool: IChatTool;
  user: IUser;
};
