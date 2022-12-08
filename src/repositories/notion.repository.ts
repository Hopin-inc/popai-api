// noinspection DuplicatedCode

import { AppDataSource } from '../config/data-source';
import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import {
  IColumnName,
  ICompany,
  INotionTask,
  IRemindTask,
  ISection,
  ITodo,
  ITodoApp,
  ITodoTask,
  ITodoUpdate,
  ITodoUserUpdate,
  IUser,
} from '../types';

import { Container, Service } from 'typedi';
import { Todo } from '../entify/todo.entity';
import { TodoAppUser } from '../entify/todoappuser.entity';
import { ColumnName } from '../entify/column_name.entity';
import { diffDays, toJapanDateTime } from '../utils/common';
import moment from 'moment';
import logger from './../logger/winston';
import TodoUserRepository from './modules/todoUser.repository';
import TodoUpdateRepository from './modules/todoUpdate.repository';
import CommonRepository from './modules/common.repository';
import LineQuequeRepository from './modules/line_queque.repository';

import { Client } from '@notionhq/client';

@Service()
export default class NotionRepository {
  private notionRequest: Client;
  private todoRepository: Repository<Todo>;
  private columnNameRepository: Repository<ColumnName>;
  private todoUpdateRepository: TodoUpdateRepository;
  private lineQueueRepository: LineQuequeRepository;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private todoUserRepository: TodoUserRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.notionRequest = new Client({ auth: process.env.NOTION_ACCESS_TOKEN });
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = Container.get(TodoUpdateRepository);
    this.columnNameRepository = AppDataSource.getRepository(ColumnName);
    this.lineQueueRepository = Container.get(LineQuequeRepository);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  syncTaskByUserBoards = async (company: ICompany, todoapp: ITodoApp): Promise<void> => {
    const companyId = company.id;
    const todoappId = todoapp.id;

    const sections = await this.commonRepository.getSections(companyId, todoappId);
    await this.getUserPageBoards(sections, company, todoapp);
  };

  getUserPageBoards = async (
    sections: ISection[],
    company: ICompany,
    todoapp: ITodoApp,
  ): Promise<void> => {
    try {
      const todoTasks: ITodoTask[] = [];

      const companyId = company.id;
      const todoappId = todoapp.id;
      const columnName = await this.getColumnName(companyId, todoappId);

      for (const section of sections) {
        await this.getCardBoards(section.boardAdminUser, section, todoTasks, company, todoapp, columnName);
      }

      const dayReminds: number[] = await this.commonRepository.getDayReminds(
        company.companyConditions,
      );

      await this.filterUpdatePages(dayReminds, todoTasks);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getColumnName = async (companyId: number, todoappId: number): Promise<IColumnName> => {
    const columnName = await this.columnNameRepository.findOneBy({
      company_id: companyId,
      todoapp_id: todoappId,
    });
    if (columnName) {
      if (!('company_id' in columnName) || !('todoapp_id' in columnName) || !('is_done' in columnName) || !('created_by' in columnName) || !('created_at' in columnName)) {
        logger.error(new LoggerError('column_nameのデータ(company_id=' + companyId + ' todoapp_id=' + todoappId + ')がありません。'));
      } else {
        return columnName;
      }
    }
  };

  getTaskName = (columnName: IColumnName, pageProperty: string): string => {
    try {
      if (pageProperty[columnName.todo]['title'][0]) {
        return pageProperty[columnName.todo]['title'][0]['plain_text'];
      } else {
        return;
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  };

  getAssignee = (columnName: IColumnName, pageProperty: string): string[] => {
    try {
      const result: string[] = [];
      const people = pageProperty[columnName.assignee]['people'];
      people.forEach(person => {
        result.push(person['id']);
      });
      return result;
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  };

  getDue = (columnName: IColumnName, pageProperty: string): Date => {
    try {
      if (pageProperty[columnName.due]['date']) {
        if (pageProperty[columnName.due]['date']['end']) {
          const endDateStr = pageProperty[columnName.due]['date']['end'];
          return new Date(endDateStr);
        } else {
          const startDateStr = pageProperty[columnName.due]['date']['start'];
          return new Date(startDateStr);
        }
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  };

  getIsDone = (columnName: IColumnName, pageProperty: string): boolean => {
    try {
      return pageProperty[columnName.is_done]['checkbox'];
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCreatedBy = (pageInfo: object): string => {
    try {
      return pageInfo['created_by']['id'];
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getLastEditedAt = (pageInfo: object): Date => {
    try {
      const lastEditedAtStr = pageInfo['last_edited_time'];
      return new Date(lastEditedAtStr);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getUrl = (pageInfo: object): string => {
    try {
      return pageInfo['url'];
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCardBoards = async (
    boardAdminUser: IUser,
    section: ISection,
    todoTasks: ITodoTask[],
    company: ICompany,
    todoapp: ITodoApp,
    columnName: IColumnName,
  ): Promise<void> => {
    if (!boardAdminUser?.todoAppUsers.length) return;

    for (const todoAppUser of boardAdminUser.todoAppUsers) {
      if (section.board_id) {
        try {
          const response = await this.notionRequest.databases.query({ database_id: section.board_id });
          const pageIds: string[] = [];
          for (const page of response['results']) {
            pageIds.push(page['id']);
          }
          const pageTodos = [];
          for (const pageId of pageIds) {
            const pageInfo = await this.notionRequest.pages.retrieve({ page_id: pageId });
            const pageProperty = pageInfo['properties'];
            const pageTodo: INotionTask = {
              todoapp_reg_id: pageId,
              name: this.getTaskName(columnName, pageProperty),
              notion_user_id: this.getAssignee(columnName, pageProperty),
              deadline: this.getDue(columnName, pageProperty),
              is_done: this.getIsDone(columnName, pageProperty),
              created_by: this.getCreatedBy(pageInfo),
              created_by_id: null,
              last_edited_at: this.getLastEditedAt(pageInfo),
              todoapp_reg_url: this.getUrl(pageInfo),
              dueReminder: null,
              closed: false,
            };

            if (pageTodo['name']) {
              pageTodos.push(pageTodo);
            }
          }

          for (const key in pageTodos) {
            const users = await this.todoUserRepository.getUserAssignTask(
              company.users,
              pageTodos[key].notion_user_id,
            );

            console.log(pageTodos);

            const page: ITodoTask = {
              todoTask: pageTodos[key] as any, //TODO:型定義をしっかりする
              company: company,
              todoapp: todoapp,
              todoAppUser: todoAppUser,
              section: section,
              users: users,
            };

            const taskFound = todoTasks.find((task) => task.todoTask?.id === pageTodos[key].todoapp_reg_id);
            if (taskFound) {
              taskFound.users = users;
            } else {
              todoTasks.push(page);
            }
          }
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  filterUpdatePages = async (dayReminds: number[], pageTodos: ITodoTask[]): Promise<void> => {
    const cards: IRemindTask[] = [];

    for (const pageTodo of pageTodos) {
      let delayedCount = 0;
      let dayDurations;
      const todoTask = pageTodo.todoTask;

      if (todoTask.deadline) {
        dayDurations = diffDays(toJapanDateTime(todoTask.deadline), toJapanDateTime(new Date()));
        delayedCount = dayDurations;
      }

      cards.push({
        remindDays: dayDurations,
        cardTodo: pageTodo,
        delayedCount: delayedCount,
      });
    }
    await this.createTodo(cards);
  };

  createTodo = async (taskReminds: IRemindTask[]): Promise<void> => {
    try {
      if (!taskReminds.length) return;
      const dataTodos: Todo[] = [];
      const dataTodoUpdates: ITodoUpdate[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];

      for (const taskRemind of taskReminds) {
        const cardTodo = taskRemind.cardTodo;
        const { users, todoTask, todoapp, company, section } = cardTodo;

        const todo: ITodo = await this.todoRepository.findOneBy({
          todoapp_reg_id: todoTask.todoapp_reg_id,
        });

        const taskDeadLine = todoTask.deadline ? toJapanDateTime(todoTask.deadline) : null;

        const todoData = new Todo();
        todoData.id = todo?.id || null;
        todoData.name = todoTask.name;
        todoData.todoapp_id = todoapp.id;
        todoData.todoapp_reg_id = todoTask.todoapp_reg_id;
        todoData.todoapp_reg_url = todoTask.todoapp_reg_url;
        todoData.todoapp_reg_created_by = null; //TODO:idに変換入れる
        todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.last_edited_at);
        todoData.company_id = company.id;
        todoData.section_id = section.id;
        todoData.deadline = taskDeadLine;
        todoData.is_done = todoTask.is_done;
        todoData.is_reminded = !!todoTask.dueReminder;
        todoData.is_closed = todoTask.closed;
        todoData.delayed_count = todo?.delayed_count || 0;
        todoData.reminded_count = todo?.reminded_count || 0;
        if (users.length) {
          dataTodoUsers.push({
            todoId: todoTask.todoapp_reg_id,
            users: users,
          });
        }

        //update deadline task
        if (taskDeadLine || todoData.is_done) {
          const isDeadlineChanged = !moment(taskDeadLine).isSame(todo?.deadline);
          const isDoneChanged = todo?.is_done !== todoData.is_done;

          if (isDeadlineChanged || isDoneChanged) {
            dataTodoUpdates.push({
              todoId: todoTask.todoapp_reg_id,
              dueTime: todo?.deadline,
              newDueTime: taskDeadLine,
              updateTime: toJapanDateTime(todoTask.last_edited_at),
            });
          }

          if (
            !todoData.is_done &&
            taskRemind.delayedCount > 0 &&
            (isDeadlineChanged || !todoData.delayed_count)
          ) {
            todoData.delayed_count = todoData.delayed_count + 1;
          }
        }

        dataTodos.push(todoData);

        //update user
        if (todo) {
          await this.todoUserRepository.updateTodoUser(todo, users);
        }
      }

      const response = await this.todoRepository.upsert(dataTodos, []);

      if (response) {
        await this.todoUpdateRepository.saveTodoHistories(dataTodoUpdates);
        await this.todoUserRepository.saveTodoUsers(dataTodoUsers);
        // await this.lineQueueRepository.pushTodoLineQueues(dataLineQueues);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };
}