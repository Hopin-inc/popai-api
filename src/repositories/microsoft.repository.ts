import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import {
  ICompany,
  ICompanyCondition,
  IMicrosoftRefresh,
  IRemindTask,
  ISection,
  ITodo,
  ITodoApp,
  ITodoAppUser,
  ITodoTask,
  ITodoUpdate,
  ITodoUserUpdate,
  IUser,
} from './../types';

import { AppDataSource } from './../config/data-source';
import { User } from './../entify/user.entity';
import { Service, Container } from 'typedi';
import { Common } from './../const/common';
import { fetchApi } from './../libs/request';
import { TodoAppUser } from './../entify/todoappuser.entity';
import { Todo } from './../entify/todo.entity';
import { Section } from './../entify/section.entity';
import { replaceString, toJapanDateTime } from './../utils/common';
import moment from 'moment';
import FormData from 'form-data';
import MicrosoftRequest from './../libs/microsoft.request';
import LineRepository from './line.repository';
import TodoUserRepository from './modules/todoUser.repository';
import TodoUpdateRepository from './modules/todoUpdate.repository';
import logger from './../logger/winston';

@Service()
export default class MicrosoftRepository {
  private userRepository: Repository<User>;
  private sectionRepository: Repository<Section>;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private microsoftRequest: MicrosoftRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: TodoUpdateRepository;
  private lineBotRepository: LineRepository;
  private todoUserRepository: TodoUserRepository;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.microsoftRequest = Container.get(MicrosoftRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = Container.get(TodoUpdateRepository);
    this.lineBotRepository = Container.get(LineRepository);
    this.todoUserRepository = Container.get(TodoUserRepository);
  }

  getSections = async (companyId: number, todoappId: number): Promise<ISection[]> => {
    const sections: ISection[] = await this.sectionRepository
      .createQueryBuilder('sections')
      .where('sections.company_id = :companyId', { companyId })
      .andWhere('sections.todoapp_id = :todoappId', { todoappId })
      .getMany();
    return sections;
  };

  getUserTodoApps = async (
    companyId: number,
    todoappId: number,
    hasMicrosoftId: boolean = true
  ): Promise<IUser[]> => {
    const query = this.userRepository
      .createQueryBuilder('users')
      .innerJoinAndSelect('users.todoAppUsers', 'todo_app_users')
      .leftJoinAndSelect('users.companyCondition', 'm_company_conditions')
      .where('users.company_id = :companyId', { companyId })
      .andWhere('todo_app_users.todoapp_id = :todoappId', { todoappId });
    if (hasMicrosoftId) {
      query.andWhere('todo_app_users.user_app_id IS NOT NULL');
    } else {
      query.andWhere('todo_app_users.user_app_id IS NULL');
    }

    const users: IUser[] = await query.getMany();
    return users;
  };

  remindUsers = async (company: ICompany, todoapp: ITodoApp): Promise<void> => {
    const companyId = company.id;
    const todoappId = todoapp.id;

    await this.updateUsersMicrosoft(companyId, todoappId);
    const sections = await this.getSections(companyId, todoappId);
    const users = await this.getUserTodoApps(companyId, todoappId);
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

      const dayReminds: number[] = await this.getDayReminds(company.companyConditions);
      await this.filterUpdateTask(dayReminds, todoTasks);
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
    const users = await this.getUserTodoApps(companyId, todoappId, false);
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

  getDayReminds = async (companyCondition: ICompanyCondition[]): Promise<number[]> => {
    const dayReminds: number[] = companyCondition
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);

    return dayReminds;
  };

  filterUpdateTask = async (dayReminds: number[], todoTaskLists: ITodoTask[]): Promise<void> => {
    const taskReminds: IRemindTask[] = [];
    const taskNomals: IRemindTask[] = [];

    for (const cardTodo of todoTaskLists) {
      let hasRemind = false;
      const todoTask = cardTodo.todoTask;

      if (todoTask.dueDateTime && todoTask.percentComplete !== Common.completed) {
        const dateExpired = moment(toJapanDateTime(todoTask.dueDateTime)).startOf('day');
        const dateNow = moment(toJapanDateTime(new Date())).startOf('day');

        const diffDays = dateExpired.diff(dateNow, 'days');
        const day = dateExpired.isAfter(dateNow) ? 0 - diffDays : diffDays;

        if (dayReminds.includes(day)) {
          hasRemind = true;
          taskReminds.push({
            remindDays: day,
            cardTodo: cardTodo,
          });
        }
      }

      if (!hasRemind) {
        taskNomals.push({
          remindDays: 0,
          cardTodo: cardTodo,
        });
      }
    }

    await this.createTodo(taskReminds, true);
    await this.createTodo(taskNomals);
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

  createTodo = async (taskReminds: IRemindTask[], isRemind: boolean = false): Promise<void> => {
    try {
      if (!taskReminds.length) return;

      const dataTodos: Todo[] = [];
      const dataTodoUpdates: ITodoUpdate[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      //const pushUserIds = [];

      for (const taskRemind of taskReminds) {
        const cardTodo = taskRemind.cardTodo;
        const { users, todoTask, todoapp, company, section, todoAppUser } = cardTodo;

        // if (isRemind && user && !pushUserIds.includes(user.id)) {
        //   // send to admin of user
        //   pushUserIds.push(user.id);
        //   await this.lineBotRepository.pushStartReportToAdmin(user);
        // }

        const todo: ITodo = await this.todoRepository.findOneBy({
          todoapp_reg_id: todoTask.id,
        });

        const todoData = new Todo();
        todoData.id = todo?.id || null;
        todoData.name = todoTask.title;
        todoData.todoapp_id = todoapp.id;
        todoData.todoapp_reg_id = todoTask.id;
        todoData.todoapp_reg_url = replaceString(
          Common.microsoftBaseUrl.concat('/', todoTask.id),
          '{tenant}',
          todoAppUser.primary_domain
        );
        todoData.todoapp_reg_created_by = todoTask.userCreateBy;
        todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.createdDateTime);
        todoData.company_id = company.id;
        todoData.section_id = section.id;
        todoData.deadline = todoTask?.dueDateTime ? toJapanDateTime(todoTask.dueDateTime) : null;
        todoData.is_done = todoTask.percentComplete === Common.completed;
        todoData.is_reminded = false;
        todoData.is_rescheduled = false;
        todoData.is_closed = false;
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
              this.lineBotRepository.pushMessageRemind(
                user,
                { ...todoData, assigned_user_id: user.id },
                taskRemind.remindDays
              );
            }
          }
        }

        dataTodos.push(todoData);

        //update task
        dataTodoUpdates.push({
          todoId: todoTask.id,
          updateTime: toJapanDateTime(new Date()),
        });

        //Update user
        if (todo) {
          this.todoUserRepository.updateTodoUser(todo, users);
        }
      }

      const response = await this.todoRepository.upsert(dataTodos, []);

      if (response) {
        await this.todoUpdateRepository.saveTodoHistories(dataTodoUpdates);
        await this.todoUserRepository.saveTodoUsers(dataTodoUsers);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };
}
