import Todo from "@/entities/Todo";
import ChatTool from "@/entities/ChatTool";
import User from "@/entities/User";

export type ITodoSlack = {
  todo: Todo;
  remindDays: number;
  chatTool: ChatTool;
  user: User;
};
