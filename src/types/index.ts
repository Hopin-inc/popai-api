import User from "@/entities/settings/User";
import { HistoryAction as Action, TodoHistoryProperty as Property } from "@/consts/common";
import Project from "@/entities/transactions/Project";

export type ValueOf<T> = T[keyof T];
export type IdOptional<T extends { id: any }> = Omit<T, "id"> & { id?: T["id"] };
export type Exclusive<
  T extends Record<PropertyKey, unknown>,
  U extends Record<PropertyKey, unknown>,
> = (T & { [k in Exclude<keyof U, keyof T>]?: never })
  | (U & { [k in Exclude<keyof T, keyof U>]?: never });

export type ITodoUserUpdate = {
  todoId: string;
  currentUserIds: string[];
  users: User[];
};

export type IProjectUserUpdate = {
  projectId: string;
  currentUserIds: string[];
  users: User[];
};

export type ITodoProjectUpdate = {
  todoId: string;
  currentProjectIds: string[];
  projects: Project[];
};

export type ITodoHistoryOption = {
  id: string;
  property: ValueOf<typeof Property>;
  action: ValueOf<typeof Action>;
  info?: ITodoHistoryInfo;
};

export type IProjectHistoryOption = {
  id: string;
  property: ValueOf<typeof Property>;
  action: ValueOf<typeof Action>;
  info?: IProjectHistoryInfo;
};

export type ITodoHistoryInfo = {
  startDate?: Date;
  deadline?: Date;
  userIds?: string[];
  projectIds?: string[];
  daysDiff?: number;
};

export type IProjectHistoryInfo = {
  startDate?: Date;
  deadline?: Date;
  userIds?: string[];
  daysDiff?: number;
};
