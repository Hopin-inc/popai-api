import User from "@/entities/settings/User";
import { TodoHistoryAction as Action, TodoHistoryProperty as Property } from "@/consts/common";

export type ValueOf<T> = T[keyof T];
export type IdOptional<T extends { id: any }> = Omit<T, "id"> & { id?: T["id"] };

export type ITodoUserUpdate = {
  todoId: string;
  users: User[];
};

export type ITodoHistoryOption = {
  todoId: string;
  property: ValueOf<typeof Property>;
  action: ValueOf<typeof Action>;
  info?: ITodoHistoryInfo;
};

export type ITodoHistoryInfo = {
  startDate?: Date;
  deadline?: Date;
  userIds?: string[];
  daysDiff?: number;
};
