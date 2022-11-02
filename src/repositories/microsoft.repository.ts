import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import {
  ICompanyCondition,
  IImplementedTodoApp,
  IMicrosoftRefresh,
  IMicrosoftTask,
  ITodo,
  ITodoAppUser,
  IUser,
} from './../types';
import logger from './../logger/winston';
import { AppDataSource } from './../config/data-source';
import { User } from './../entify/user.entity';
import MicrosoftRequest from './../libs/microsoft.request';
import { Service, Container } from 'typedi';
import moment from 'moment';
import { Common } from './../const/common';
import { ImplementedTodoApp } from './../entify/implemented.todoapp.entity';
import { fetchApi } from './../libs/request';
import { TodoAppUser } from './../entify/todoappuser.entity';
import { Todo } from './../entify/todo.entity';
import FormData from 'form-data';
import { TodoUpdateHistory } from './../entify/todoupdatehistory.entity';
import LineRepository from './line.repository';

@Service()
export default class MicrosoftRepository {
  private userRepository: Repository<User>;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private implementTodoAppRepository: Repository<ImplementedTodoApp>;
  private microsoftRequest: MicrosoftRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: Repository<TodoUpdateHistory>;
  private lineBotRepository: LineRepository;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.implementTodoAppRepository = AppDataSource.getRepository(ImplementedTodoApp);
    this.microsoftRequest = Container.get(MicrosoftRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = AppDataSource.getRepository(TodoUpdateHistory);
    this.lineBotRepository = Container.get(LineRepository);
  }

  getImplementedTodoApp = async (
    companyId: number,
    todoappId: number
  ): Promise<IImplementedTodoApp> => {
    const implementedTodoApp = await this.implementTodoAppRepository
      .createQueryBuilder('implemented_todo_apps')
      .where('implemented_todo_apps.company_id = :companyId', { companyId })
      .andWhere('implemented_todo_apps.todoapp_id = :todoappId', { todoappId })
      .getOne();
    return implementedTodoApp;
  };

  getUserTodoApps = async (companyId: number, todoappId: number): Promise<IUser[]> => {
    const users: IUser[] = await this.userRepository
      .createQueryBuilder('users')
      .innerJoinAndSelect('users.todoAppUsers', 'todo_app_users')
      .leftJoinAndSelect('users.companyCondition', 'm_company_conditions')
      .where('users.company_id = :companyId', { companyId })
      .andWhere('todo_app_users.todoapp_id = :todoappId', { todoappId })
      .getMany();
    return users;
  };

  remindUsers = async (companyId: number, todoappId: number): Promise<void> => {
    const implementedTodoApp = await this.getImplementedTodoApp(companyId, todoappId);
    const users = await this.getUserTodoApps(companyId, todoappId);

    if (!users.length) {
      return;
    }

    for (const user of users) {
      if (user.todoAppUsers.length) {
        this.remindUserByTodoApp(user, implementedTodoApp);
      }
    }
  };

  remindUserByTodoApp = async (
    user: IUser,
    implementedTodoApp: IImplementedTodoApp
  ): Promise<void> => {
    for (const todoAppUser of user.todoAppUsers) {
      if (todoAppUser.api_token) {
        await this.getTodoListsByUser(user, todoAppUser, implementedTodoApp);
      }
    }
  };

  getTodoListsByUser = async (
    user: IUser,
    todoAppUser: ITodoAppUser,
    implementedTodoApp: IImplementedTodoApp
  ): Promise<void> => {
    try {
      const dataRefresh: IMicrosoftRefresh = {
        ternant: implementedTodoApp,
        todoAppUser: todoAppUser,
      };

      const userTaskLists = await this.microsoftRequest.fetchApi(
        'me/todo/lists',
        'GET',
        {},
        dataRefresh
      );

      if (userTaskLists['value'] && userTaskLists['value'].length) {
        for (const taskList of userTaskLists['value']) {
          await this.getTodoTaskReminds(user, todoAppUser, taskList, dataRefresh);
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  getTodoTaskReminds = async (
    user: IUser,
    todoAppUser: ITodoAppUser,
    taskList: any,
    dataRefresh: IMicrosoftRefresh
  ): Promise<void> => {
    try {
      //todo
      const todoTaskLists = await this.microsoftRequest.fetchApi(
        '/me/todo/lists/' + taskList.id + '/tasks',
        'GET',
        {},
        dataRefresh
      );
      await this.filterUpdateTask(user, todoAppUser, todoTaskLists['value'] || []);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  getDayReminds = async (companyCondition: ICompanyCondition[]): Promise<number[]> => {
    const dayReminds: number[] = companyCondition
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);

    return dayReminds;
  };

  filterUpdateTask = async (
    user: IUser,
    todoAppUser: ITodoAppUser,
    todoTaskLists: IMicrosoftTask[]
  ): Promise<void> => {
    const taskReminds: IMicrosoftTask[] = [];
    const taskNomals: IMicrosoftTask[] = [];

    const dayReminds: number[] = await this.getDayReminds(user.companyCondition);

    for (const todoTask of todoTaskLists) {
      let hasRemind = false;

      if (todoTask.dueDateTime && todoTask.status !== Common.completed) {
        const dueDate = moment.utc(todoTask.dueDateTime.dateTime).toDate();
        const dateExpired = moment(dueDate).startOf('day');
        const dateNow = moment().startOf('day');

        const duration = moment.duration(dateExpired.diff(dateNow));
        const day = duration.asDays();

        if (dayReminds.includes(day)) {
          hasRemind = true;
          taskReminds.push(todoTask);
        }
      }

      if (!hasRemind) {
        taskNomals.push(todoTask);
      }
    }

    this.createTodo(user, todoAppUser, taskReminds, true);
    this.createTodo(user, todoAppUser, taskNomals);
  };

  refreshToken = async (dataRefresh: IMicrosoftRefresh): Promise<ITodoAppUser | null> => {
    try {
      const { ternant, todoAppUser } = dataRefresh;
      const ternantId = ternant.tenant_id;
      const todoAppUserData = todoAppUser;

      if (ternantId && todoAppUserData.refresh_token) {
        const url = 'https://login.microsoftonline.com/' + ternantId + '/oauth2/v2.0/token';

        const formData = new FormData();
        formData.append('client_id', ternant.application_id);
        formData.append('scope', 'https://graph.microsoft.com/.default');
        formData.append('refresh_token', todoAppUserData.refresh_token);
        formData.append('grant_type', 'refresh_token');
        formData.append('client_secret', ternant.client_secret);

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
    user: IUser,
    todoAppUser: ITodoAppUser,
    taskReminds: IMicrosoftTask[],
    isRemind: boolean = false
  ): Promise<void> => {
    try {
      if (!taskReminds.length) return;

      const dataTodos = [];
      const dataTodoIDUpdates = [];

      if (isRemind) {
        // send to admin of user
        await this.lineBotRepository.pushStartReportToAdmin(user);
      }

      for (const todoTask of taskReminds) {
        const todoData = new Todo();
        todoData.name = todoTask.title;
        todoData.todoapp_id = todoAppUser.todoapp_id;
        todoData.todoapp_reg_id = todoTask.id;
        todoData.todoapp_reg_url = Common.microsoftBaseUrl.concat('/', todoTask.id);
        todoData.todoapp_reg_created_by = null;
        todoData.todoapp_reg_created_at = moment(todoTask.createdDateTime).toDate();
        todoData.assigned_user_id = todoAppUser.employee_id;
        todoData.deadline = todoTask?.dueDateTime
          ? moment.utc(todoTask.dueDateTime.dateTime).toDate()
          : null;
        todoData.is_done = todoTask.status === Common.completed;
        todoData.is_reminded = todoTask.isReminderOn;
        todoData.is_rescheduled = null;
        dataTodos.push(todoData);

        if (isRemind) {
          // send Line message
          this.lineBotRepository.pushMessageRemind(user, todoData);
        }

        if (todoTask.lastModifiedDateTime) {
          dataTodoIDUpdates.push({
            todoId: todoTask.id,
            updateTime: moment(todoTask.lastModifiedDateTime).toDate(),
          });
        }
      }

      const response = await this.todoRepository.upsert(dataTodos, []);

      if (response && dataTodoIDUpdates.length) {
        for (const dataUpdate of dataTodoIDUpdates) {
          const todo: ITodo = await this.todoRepository.findOneBy({
            todoapp_reg_id: dataUpdate.todoId,
          });

          if (todo) {
            this.saveTodoHistory(todo, dataUpdate.updateTime);
          }
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  saveTodoHistory = async (todo: ITodo, updateTime: Date) => {
    try {
      const todoUpdateData = await this.todoUpdateRepository.findOne({
        where: { todo_id: todo.id },
        order: { id: 'DESC' },
      });

      const taskUpdate = moment(updateTime).format('YYYY-MM-DD HH:mm:ss');
      if (todoUpdateData) {
        const oldDate = moment(todoUpdateData.todoapp_reg_updated_at).format('YYYY-MM-DD HH:mm:ss');
        if (moment(oldDate).isSame(taskUpdate)) {
          return;
        }
      }

      const todoUpdate = new TodoUpdateHistory();
      todoUpdate.todo_id = todo.id;
      todoUpdate.todoapp_reg_updated_at = moment(taskUpdate).toDate();
      this.todoUpdateRepository.save(todoUpdate);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };
}
