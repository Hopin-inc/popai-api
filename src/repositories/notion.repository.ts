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
      if (
        !('companyId' in columnName) ||
        !('todoappId' in columnName) ||
        !('isDone' in columnName) ||
        !('createdBy' in columnName) ||
        !('createdAt' in columnName))
        logger.error(
          new LoggerError(
            'column_nameのデータ(company_id=' +
            companyId +
            ' todoapp_id=' +
            todoappId +
            ')がありません。',
          ),
        );
    }else{
      return columnName;
    }
  };

  getTaskName = (columnName: IColumnName, pageProperty: string): string => {
    try {
      return pageProperty[columnName.name]['title'][0]['text']['content'];
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  };

  getAssignee = (columnName: IColumnName, pageProperty: string): string[] => {
    try {
      const result: string[] = [];
      const people = pageProperty[columnName.assignee]['people'];
      if (people.length < 2) {
        result.push(people[0]['id']);
      } else if (people.length > 1) {
        for (let i = 0; i < people.length; i++) {
          result.push(people[i]['id']);
        }
        return result;
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  };

  getDue = (columnName: IColumnName, pageProperty: string): Date => {
    try {
      const endDateStr = pageProperty[columnName.due]['date']['end'];
      if (endDateStr != null) {
        return new Date(endDateStr);
      } else {
        const startDateStr = pageProperty[columnName.due]['date']['start'];
        return new Date(startDateStr);
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  };

  getIsDone = (columnName: IColumnName, pageProperty: string): boolean => {
    try {
      return pageProperty[columnName.isDone]['checkbox'];
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCreatedBy = (pageProperty: string): string => {
    try {
      return pageProperty['created_by'];
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCreatedAt = (pageProperty: string): Date => {
    try {
      const createdAtStr = pageProperty['created_time'];
      return new Date(createdAtStr);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getUrl = (pageProperty: string): string => {
    try {
      return pageProperty['url'];
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
      if (todoAppUser.api_token && section.board_id) {
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
              created_by: this.getCreatedBy(pageProperty),
              created_at: this.getCreatedAt(pageProperty),
              todoapp_reg_url: this.getUrl(pageProperty),
            };
            pageTodos.push(pageTodo);

            for (const key in pageTodos) {
              const users = await this.todoUserRepository.getUserAssignTask(
                company.users,
                pageTodos[key].user_notion_id,
              );

              const page: ITodoTask = {
                todoTask: pageTodo as any, //TODO:型定義をしっかりする
                company: company,
                todoapp: todoapp,
                todoAppUser: todoAppUser,
                section: section,
                users: users,
              };

              const taskFound = pageTodos.find((task) => task.todoTask?.id === pageTodo.todoapp_reg_id);
              if (taskFound) {
                taskFound.users = users;
              } else {
                pageTodos.push(page);
              }
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

      if (todoTask.due) {
        dayDurations = diffDays(toJapanDateTime(todoTask.due), toJapanDateTime(new Date()));
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
          todoapp_reg_id: todoTask.id,
        });

        const taskDeadLine = todoTask.due ? toJapanDateTime(todoTask.due) : null;

        const todoData = new Todo();
        todoData.id = todo?.id || null;
        todoData.name = todoTask.name;
        todoData.todoapp_id = todoapp.id;
        todoData.todoapp_reg_id = todoTask.id;
        todoData.todoapp_reg_url = todoTask.shortUrl;
        todoData.todoapp_reg_created_by = null;
        todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.dateLastActivity);
        todoData.company_id = company.id;
        todoData.section_id = section.id;
        todoData.deadline = taskDeadLine;
        todoData.is_done = todoTask.dueComplete;
        todoData.is_reminded = !!todoTask.dueReminder;
        todoData.is_closed = todoTask.closed;
        todoData.delayed_count = todo?.delayed_count || 0;
        todoData.reminded_count = todo?.reminded_count || 0;

        if (users.length) {
          dataTodoUsers.push({
            todoId: todoTask.id,
            users: users,
          });
        }

        //update deadline task
        if (taskDeadLine || todoData.is_done) {
          const isDeadlineChanged = !moment(taskDeadLine).isSame(todo?.deadline);
          const isDoneChanged = todo?.is_done !== todoData.is_done;

          if (isDeadlineChanged || isDoneChanged) {
            dataTodoUpdates.push({
              todoId: todoTask.id,
              dueTime: todo?.deadline,
              newDueTime: taskDeadLine,
              updateTime: toJapanDateTime(todoTask.dateLastActivity),
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