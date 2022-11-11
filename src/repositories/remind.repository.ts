import { AppDataSource } from '../config/data-source';
import { InternalServerErrorException, LoggerError } from '../exceptions';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';

import { Company } from './../entify/company.entity';
import MicrosoftRepository from './microsoft.repository';
import TrelloRepository from './trello.repository';
import { ICompany, ITodoApp } from './../types';
import { ChatToolCode, Common } from './../const/common';
import { Service, Container } from 'typedi';
import logger from './../logger/winston';
import { Todo } from '../entify/todo.entity';
import LineRepository from './line.repository';
import { TodoUser } from './../entify/todouser.entity';
import CommonRepository from './modules/common.repository';

@Service()
export default class Remindrepository {
  private trelloRepo: TrelloRepository;
  private microsofRepo: MicrosoftRepository;
  private lineRepo: LineRepository;
  private commonRepository: CommonRepository;

  private companyRepository: Repository<Company>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.trelloRepo = Container.get(TrelloRepository);
    this.microsofRepo = Container.get(MicrosoftRepository);
    this.lineRepo = Container.get(LineRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.companyRepository = AppDataSource.getRepository(Company);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  remindCompany = async (): Promise<any> => {
    try {
      const companies = await this.companyRepository.find({
        relations: ['todoapps', 'chattools', 'admin_user', 'companyConditions'],
      });

      for (const company of companies) {
        if (company.todoapps.length) {
          this.remindCompanyApp(company, company.todoapps);
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };

  remindCompanyApp = async (company: ICompany, todoapps: ITodoApp[]): Promise<void> => {
    for (const todoapp of todoapps) {
      switch (todoapp.todo_app_code) {
        case Common.trello:
          await this.trelloRepo.remindUsers(company, todoapp);
          break;
        case Common.microsoft:
          await this.microsofRepo.remindUsers(company, todoapp);
          break;
        default:
          break;
      }
    }

    if (!company.admin_user) {
      logger.error(new LoggerError(company.name + 'の管理者が設定していません。'));
    }

    const chattoolUsers = await this.commonRepository.getChatToolUsers();
    const needRemindTasks = await this.getNotsetDueDateOrNotAssignTasks(company.id);

    // 期日未設定のタスクがない旨のメッセージが管理者に送られること
    if (needRemindTasks.length) {
      // 期日未設定のタスクがある場合

      const notSetDueDateAndNotAssign = needRemindTasks.filter(
        (task) => !task.deadline && !task.todoUsers.length
      );

      if (notSetDueDateAndNotAssign.length) {
        // 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
        // Send to admin list task which not set duedate

        company.chattools.forEach(async (chattool) => {
          if (chattool.tool_code == ChatToolCode.LINE) {
            const adminUser = company.admin_user;
            const chatToolUsers = chattoolUsers.filter(
              (chattoolUser) =>
                chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == adminUser.id
            );

            if (chatToolUsers.length) {
              await this.lineRepo.pushListTaskMessageToAdmin(
                chattool,
                { ...adminUser, line_id: chatToolUsers[0].auth_key },
                notSetDueDateAndNotAssign
              );
            }
          }
        });

        await this.updateRemindedCount(notSetDueDateAndNotAssign);
      } else {
        company.chattools.forEach(async (chattool) => {
          if (chattool.tool_code == ChatToolCode.LINE) {
            const adminUser = company.admin_user;
            const chatToolUsers = chattoolUsers.filter(
              (chattoolUser) =>
                chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == adminUser.id
            );

            if (chatToolUsers.length) {
              await this.lineRepo.pushNoListTaskMessageToAdmin(chattool, {
                ...adminUser,
                line_id: chatToolUsers[0].auth_key,
              });
            }
          }
        });
      }

      // ・期日未設定のタスク一覧が1つのメッセージで担当者に送られること

      const notSetDueDateTasks = needRemindTasks.filter(
        (task) =>
          !task.deadline && task.todoUsers.length && task.reminded_count < Common.remindMaxCount
      );

      // Send list task to each user
      if (notSetDueDateTasks.length) {
        const userTodoMap = this.mapUserTaskList(notSetDueDateTasks);

        userTodoMap.forEach(async (todos: Array<Todo>, userId: number) => {
          company.chattools.forEach(async (chattool) => {
            if (chattool.tool_code == ChatToolCode.LINE) {
              const user = todos[0].user;

              const chatToolUsers = chattoolUsers.filter(
                (chattoolUser) =>
                  chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == user.id
              );

              if (chatToolUsers.length) {
                await this.lineRepo.pushListTaskMessageToUser(
                  chattool,
                  { ...user, line_id: chatToolUsers[0].auth_key },
                  todos
                );
              }
            }
          });

          await this.updateRemindedCount(todos);
        });
      }

      // 担当者未設定・期日設定済みの場合
      const notSetAssignTasks = needRemindTasks.filter(
        (task) =>
          task.deadline && !task.todoUsers.length && task.reminded_count < Common.remindMaxCount
      );

      if (notSetAssignTasks.length) {
        company.chattools.forEach(async (chattool) => {
          if (chattool.tool_code == ChatToolCode.LINE) {
            const adminUser = company.admin_user;
            const chatToolUsers = chattoolUsers.filter(
              (chattoolUser) =>
                chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == adminUser.id
            );

            if (chatToolUsers.length) {
              await this.lineRepo.pushNotAssignListTaskMessageToAdmin(
                chattool,
                { ...adminUser, line_id: chatToolUsers[0].auth_key },
                notSetAssignTasks
              );
            }
          }
        });

        await this.updateRemindedCount(notSetAssignTasks);
      }
    }
  };

  getNotsetDueDateOrNotAssignTasks = async (companyId: number): Promise<Array<Todo>> => {
    const notExistsQuery = <T>(builder: SelectQueryBuilder<T>) =>
      `not exists (${builder.getQuery()})`;
    const todos: Todo[] = await this.todoRepository
      .createQueryBuilder('todos')
      .leftJoinAndSelect('todos.todoUsers', 'todo_users')
      .leftJoinAndSelect('todo_users.user', 'users')
      .where('todos.company_id = :companyId', { companyId })
      .andWhere('todos.is_closed =:closed', { closed: false })
      .andWhere(
        new Brackets((qb) => {
          qb.where('todos.deadline IS NULL').orWhere(
            notExistsQuery(
              AppDataSource.getRepository(TodoUser)
                .createQueryBuilder('todo_users')
                .where('todo_users.todo_id = todos.id')
                .andWhere('todo_users.user_id IS NOT NULL')
            )
          );
        })
      )
      // .andWhere(
      //   new Brackets((qb) => {
      //     qb.where('todos.reminded_count < :count', {
      //       count: 2,
      //     });
      //   })
      // )
      .getMany();

    return todos;
  };

  mapUserTaskList = (todos: Array<Todo>): Map<number, Array<Todo>> => {
    const map = new Map<number, Array<Todo>>();

    todos.forEach((todo) => {
      for (const todoUser of todo.todoUsers) {
        if (map.has(todoUser.user.id)) {
          map.get(todoUser.user.id).push({ ...todo, user: todoUser.user });
        } else {
          map.set(todoUser.user.id, [{ ...todo, user: todoUser.user }]);
        }
      }
    });

    return map;
  };

  updateRemindedCount = async (todos: Array<Todo>): Promise<any> => {
    const todoDatas = todos.map((todo) => {
      return {
        ...todo,
        reminded_count: todo.reminded_count + 1,
      };
    });
    return await this.todoRepository.upsert(todoDatas, []);
  };
}
