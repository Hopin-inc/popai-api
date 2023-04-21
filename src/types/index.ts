import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";
import { INotionTask } from "@/types/notion";

export type ValueOf<T> = T[keyof T];

export type IdOptional<T extends { id: any }> = Omit<T, "id"> & { id?: T["id"] };

export type ITodoHistory = {
  todoId: string;
  companyId: string;
  name?: string;
  startDate?: Date;
  deadline?: Date;
  users?: User[];
  isDone: boolean;
  isClosed: boolean;
  todoAppRegUpdatedAt: Date;
};

export type ITodoUserUpdate = {
  todoId: string;
  users: User[];
};

export type ITask = INotionTask;

export type ITodoTask<T extends ITask> = {
  todoTask: T;
  company: Company;
  users?: User[];
};

export type IRemindTask<T extends ITask> = {
  cardTodo: ITodoTask<T>;
};
