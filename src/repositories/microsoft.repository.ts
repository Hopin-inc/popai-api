import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import {
  ICompany,
  IMicrosoftRefresh,
  IRemindTask,
  ISection,
  ITodo,
  ITodoApp,
  ITodoAppUser,
  ITodoLines,
  ITodoTask,
  ITodoUpdate,
  ITodoUserUpdate,
  IUser,
} from './../types';

import { AppDataSource } from './../config/data-source';
import { Service, Container } from 'typedi';
import { ChatToolCode, Common } from './../const/common';
import { fetchApi } from './../libs/request';
import { TodoAppUser } from './../entify/todoappuser.entity';
import { Todo } from './../entify/todo.entity';
import { replaceString, toJapanDateTime } from './../utils/common';
import moment from 'moment';
import FormData from 'form-data';
import MicrosoftRequest from './../libs/microsoft.request';
import LineRepository from './line.repository';
import TodoUserRepository from './modules/todoUser.repository';
import TodoUpdateRepository from './modules/todoUpdate.repository';
import logger from './../logger/winston';
import { ImplementedTodoApp } from '../entify/implemented.todoapp.entity';
import CommonRepository from './modules/common.repository';

@Service()
export default class MicrosoftRepository {
  private todoAppUserRepository: Repository<TodoAppUser>;
  private microsoftRequest: MicrosoftRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: TodoUpdateRepository;
  private lineBotRepository: LineRepository;
  private todoUserRepository: TodoUserRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.microsoftRequest = Container.get(MicrosoftRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = Container.get(TodoUpdateRepository);
    this.lineBotRepository = Container.get(LineRepository);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  remindUsers = async (company: ICompany, todoapp: ITodoApp): Promise<void> => {
    const companyId = company.id;
    const todoappId = todoapp.id;

    await this.updateUsersMicrosoft(companyId, todoappId);
    const sections = await this.commonRepository.getSections(companyId, todoappId);
    const users = await this.commonRepository.getUserTodoApps(companyId, todoappId);
    await this.getUserTaskBoards(users, sections, company, todoapp);
  };

  getUserTaskBoards = async (
    users: IUser[],
    sections: ISection[],
    company: ICompany,
    todoapp: ITodoApp
  ): Promise<void> => {
    try {
      const todoTasks: ITodoTask[] = [];
      for await (const user of users) {
        for (const section of sections) {
          await this.getTaskBoards(user, section, todoTasks, company, todoapp);
        }
      }

      const dayReminds: number[] = await this.commonRepository.getDayReminds(
        company.companyConditions
      );

      const implementTodoApp = await this.commonRepository.getImplementTodoApp(
        company.id,
        todoapp.id
      );

      if (implementTodoApp) {
        await this.filterUpdateTask(dayReminds, todoTasks, implementTodoApp);
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getTaskBoards = async (
    user: IUser,
    section: ISection,
    todoTasks: ITodoTask[],
    company: ICompany,
    todoapp: ITodoApp
  ): Promise<void> => {
    if (!user.todoAppUsers.length) return;

    for (const todoAppUser of user.todoAppUsers) {
      if (todoAppUser.api_token && section.board_id) {
        try {
          const dataRefresh: IMicrosoftRefresh = {
            todoAppUser: todoAppUser,
          };

          const taskTodos = await this.microsoftRequest.fetchApi(
            'planner/plans/' + section.board_id + '/tasks',
            'GET',
            {},
            dataRefresh
          );

          if (taskTodos['value'] && taskTodos['value'].length) {
            for (const todoTask of taskTodos['value']) {
              let userCreateBy = null;
              if (todoTask.createdBy) {
                if (todoTask.createdBy?.user?.id === todoAppUser.user_app_id) {
                  userCreateBy = user.id;
                }
              }

              const card: ITodoTask = {
                todoTask: { ...todoTask, userCreateBy: userCreateBy },
                company: company,
                todoapp: todoapp,
                todoAppUser: todoAppUser,
                section: section,
                users: [],
              };

              const userAssigns = Object.keys(todoTask.assignments);
              const taskFound = todoTasks.find((task) => task.todoTask?.id === todoTask.id);

              if (taskFound) {
                if (userAssigns.includes(todoAppUser.user_app_id)) {
                  taskFound.users.push(user);
                }
                if (userCreateBy) {
                  taskFound.todoTask.userCreateBy = userCreateBy;
                }
              } else {
                if (userAssigns.includes(todoAppUser.user_app_id)) {
                  card.users = [user];
                }
                todoTasks.push(card);
              }
            }
          }
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  updateUsersMicrosoft = async (companyId: number, todoappId: number): Promise<void> => {
    const users = await this.commonRepository.getUserTodoApps(companyId, todoappId, false);
    for (const user of users) {
      if (user.todoAppUsers.length) {
        await this.updateMicosoftUser(user.todoAppUsers);
      }
    }
  };

  updateMicosoftUser = async (todoAppUsers: ITodoAppUser[]): Promise<any> => {
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_token) {
        try {
          const dataRefresh: IMicrosoftRefresh = {
            todoAppUser: todoAppUser,
          };

          const me = await this.microsoftRequest.fetchApi('me', 'GET', {}, dataRefresh);
          todoAppUser.user_app_id = me?.id;
          await this.todoAppUserRepository.save(todoAppUser);
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  filterUpdateTask = async (
    dayReminds: number[],
    todoTaskLists: ITodoTask[],
    implementTodoApp: ImplementedTodoApp
  ): Promise<void> => {
    const taskReminds: IRemindTask[] = [];
    const taskNomals: IRemindTask[] = [];

    for (const cardTodo of todoTaskLists) {
      let hasRemind = false;
      let delayedCount = 0;
      const todoTask = cardTodo.todoTask;

      if (todoTask.dueDateTime) {
        const dateExpired = moment(toJapanDateTime(todoTask.dueDateTime)).startOf('day');
        const dateNow = moment(toJapanDateTime(new Date())).startOf('day');

        const diffDays = dateNow.diff(dateExpired, 'days');
        delayedCount = diffDays;

        if (dayReminds.includes(diffDays) && todoTask.percentComplete !== Common.completed) {
          hasRemind = true;
          taskReminds.push({
            remindDays: diffDays,
            cardTodo: cardTodo,
            delayedCount: delayedCount,
            dayReminds: dayReminds,
          });
        }
      }

      if (!hasRemind) {
        taskNomals.push({
          remindDays: 0,
          cardTodo: cardTodo,
          delayedCount: delayedCount,
          dayReminds: dayReminds,
        });
      }
    }

    await this.createTodo(taskReminds, implementTodoApp, true);
    await this.createTodo(taskNomals, implementTodoApp);
  };

  refreshToken = async (dataRefresh: IMicrosoftRefresh): Promise<ITodoAppUser | null> => {
    try {
      const { todoAppUser } = dataRefresh;
      const todoAppUserData = todoAppUser;
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

      if (clientId && clientSecret && todoAppUserData.refresh_token) {
        const url = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

        const formData = new FormData();
        formData.append('client_id', clientId);
        formData.append('scope', 'https://graph.microsoft.com/.default');
        formData.append('refresh_token', todoAppUserData.refresh_token);
        formData.append('grant_type', 'refresh_token');
        formData.append('client_secret', clientSecret);

        const response = await fetchApi(url, 'POST', formData, true);

        if (response.access_token) {
          const todoAppUser: ITodoAppUser = await this.todoAppUserRepository.findOneBy({
            id: todoAppUserData.id,
          });

          if (todoAppUser) {
            todoAppUser.api_token = response.access_token;
            todoAppUser.refresh_token = response.refresh_token;
            todoAppUser.expires_in = response.expires_in;
            return await this.todoAppUserRepository.save(todoAppUser);
          }
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }

    return null;
  };

  createTodo = async (
    taskReminds: IRemindTask[],
    implementTodoApp: ImplementedTodoApp,
    isRemind: boolean = false
  ): Promise<void> => {
    try {
      if (!taskReminds.length) return;

      const dataTodos: Todo[] = [];
      const dataTodoUpdates: ITodoUpdate[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      const dataTodoLines: ITodoLines[] = [];
      //const pushUserIds = [];

      for (const taskRemind of taskReminds) {
        const cardTodo = taskRemind.cardTodo;
        const dayReminds = taskRemind.dayReminds;
        const { users, todoTask, todoapp, company, section, todoAppUser } = cardTodo;

        // if (isRemind && user && !pushUserIds.includes(user.id)) {
        //   // send to admin of user
        //   pushUserIds.push(user.id);
        //   await this.lineBotRepository.pushStartReportToAdmin(user);
        // }

        const todo: ITodo = await this.todoRepository.findOneBy({
          todoapp_reg_id: todoTask.id,
        });

        const taskDeadLine = todoTask?.dueDateTime ? toJapanDateTime(todoTask.dueDateTime) : null;

        const todoData = new Todo();
        todoData.id = todo?.id || null;
        todoData.name = todoTask.title;
        todoData.todoapp_id = todoapp.id;
        todoData.todoapp_reg_id = todoTask.id;
        todoData.todoapp_reg_url = replaceString(
          Common.microsoftBaseUrl.concat('/', todoTask.id),
          '{tenant}',
          implementTodoApp.primary_domain
        );
        todoData.todoapp_reg_created_by = todoTask.userCreateBy;
        todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.createdDateTime);
        todoData.company_id = company.id;
        todoData.section_id = section.id;
        todoData.deadline = taskDeadLine;
        todoData.is_done = todoTask.percentComplete === Common.completed;
        todoData.is_reminded = false;
        todoData.is_closed = false;
        todoData.delayed_count = todo?.delayed_count || 0;
        todoData.reminded_count = todo?.reminded_count || 0;

        if (users.length) {
          dataTodoUsers.push({
            todoId: todoTask.id,
            users: users,
          });

          if (isRemind) {
            todoData.reminded_count = 1;
            // send Line message
            for (const user of users) {
              company.chattools.forEach(async (chattool) => {
                if (chattool.tool_code == ChatToolCode.LINE) {
                  dataTodoLines.push({
                    todoId: todoTask.id,
                    remindDays: taskRemind.remindDays,
                    dayReminds: dayReminds,
                    chattool: chattool,
                    user: user,
                  });
                }
              });
            }
          }
        }

        //update task
        if ((taskDeadLine && taskRemind.delayedCount > 0) || todoData.is_done) {
          if (!moment(taskDeadLine).isSame(todo?.deadline) || todo?.is_done !== todoData.is_done) {
            if (!todoData.is_done) {
              todoData.delayed_count = todoData.delayed_count + 1;
            }

            dataTodoUpdates.push({
              todoId: todoTask.id,
              dueTime: todo?.deadline,
              newDueTime: taskDeadLine,
              updateTime: toJapanDateTime(new Date()),
            });
          }
        }

        dataTodos.push(todoData);

        //Update user
        if (todo) {
          this.todoUserRepository.updateTodoUser(todo, users);
        }
      }

      const response = await this.todoRepository.upsert(dataTodos, []);

      if (response) {
        await this.todoUpdateRepository.saveTodoHistories(dataTodoUpdates);
        await this.todoUserRepository.saveTodoUsers(dataTodoUsers);
        await this.commonRepository.pushTodoLines(dataTodoLines);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };
}
