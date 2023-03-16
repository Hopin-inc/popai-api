import ChatTool from "@/entities/masters/ChatTool";
import LineMessageQueue from "@/entities/transactions/LineMessageQueue";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import User from "@/entities/settings/User";
import TodoApp from "@/entities/masters/TodoApp";
import Todo from "@/entities/transactions/Todo";

import { ITrelloTask } from "@/types/trello";
import { IMicrosoftTask } from "@/types/microsoft";
import { INotionTask } from "@/types/notion";

export type valueOf<T> = T[keyof T];

export type ITodoUpdate = {
  todoId: string;
  dueTime?: Date;
  newDueTime: Date;
  newIsDone?: boolean;
  updateTime: Date;
};

export type ITodoHistory = {
  todoId: string;
  name?: string;
  deadline?: Date;
  users?: User[];
  isDone: boolean;
  isClosed: boolean;
  todoappRegUpdatedAt: Date;
  editedBy?: number;
};

export type ITodoUserUpdate = {
  todoId: string;
  users: User[];
};

export type ITodoSectionUpdate = {
  todoId: string;
  sections: Section[];
}

export type ITask = ITrelloTask | IMicrosoftTask | INotionTask;

export type ITodoTask<T extends ITask> = {
  todoTask: T;
  todoapp: TodoApp;
  todoAppUser: TodoAppUser;
  company: Company;
  sections: Section[];
  users?: User[];
};

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
  todo: Todo;
  remindDays: number;
  chattool: ChatTool;
  user: User;
  todoQueueTask?: LineMessageQueue;
};

export type IDailyReportItems = {
  completedYesterday: Todo[];
  delayed: Todo[];
  ongoing: Todo[];
};

export type IPerformanceReportItems = {
  planed: Todo[];
  completed: Todo[];
  delayed: Todo[];
  closed: Todo[];
};
