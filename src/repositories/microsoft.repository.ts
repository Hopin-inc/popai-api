import { getToken, tokenRequest } from '../config/microsoft';
import { InternalServerErrorException } from '../exceptions';
import { Repository } from 'typeorm';
import { IImplementedTodoApp, IMicrosoftTask, ITodoAppUser, IUser } from './../types';
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

@Service()
export default class MicrosoftRepository {
  private userRepository: Repository<User>;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private implementTodoAppRepository: Repository<ImplementedTodoApp>;
  private microsoftRequest: MicrosoftRequest;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.implementTodoAppRepository = AppDataSource.getRepository(ImplementedTodoApp);
    this.microsoftRequest = Container.get(MicrosoftRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
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
      .leftJoinAndSelect('users.todoAppUsers', 'todo_app_users')
      .where('users.company_id = :companyId', { companyId })
      .where('todo_app_users.todoapp_id = :todoappId', { todoappId })
      .getMany();
    return users;
  };

  remindUsers = async (companyId: number, todoappId: number): Promise<void> => {
    const implementedTodoApp = await this.getImplementedTodoApp(companyId, todoappId);
    this.microsoftRequest.setTernant(implementedTodoApp);

    const users = await this.getUserTodoApps(companyId, todoappId);
    if (!users.length) {
      return;
    }

    for (const user of users) {
      if (user.todoAppUsers.length) {
        this.remindUserByTodoApp(user.id, user.todoAppUsers);
      }
    }
  };

  remindUserByTodoApp = async (userId: number, todoAppUsers: ITodoAppUser[]): Promise<void> => {
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_token) {
        this.getTodoListsByUser(userId, todoAppUser);
      }
    }
  };

  getTodoListsByUser = async (userId: number, todoAppUser: ITodoAppUser): Promise<void> => {
    try {
      this.microsoftRequest.setAuth(todoAppUser.api_token);
      this.microsoftRequest.setTodoAppUser(todoAppUser);
      const userTaskLists = await this.microsoftRequest.fetchApi('me/todo/lists', 'GET');
      if (userTaskLists['value'] && userTaskLists['value'].length) {
        for (const taskList of userTaskLists['value']) {
          this.getTodoTaskReminds(todoAppUser, taskList);
        }
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  getTodoTaskReminds = async (todoAppUser: ITodoAppUser, taskList: any): Promise<void> => {
    try {
      //todo
      const todoTaskLists = await this.microsoftRequest.fetchApi(
        '/me/todo/lists/' + taskList.id + '/tasks',
        'GET'
      );
      const taskReminds = await this.findTaskRemind(todoTaskLists['value'] || []);
      this.createTodo(todoAppUser, taskReminds);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  findTaskRemind = async (todoTaskLists: IMicrosoftTask[]): Promise<IMicrosoftTask[]> => {
    const taskReminds: IMicrosoftTask[] = [];
    for (const todoTask of todoTaskLists) {
      this.updateTodo(todoTask);

      if (todoTask.dueDateTime && todoTask.status !== Common.completed) {
        const dueDate = todoTask.dueDateTime.dateTime;
        const dateExpired = moment(dueDate);
        const dateNow = moment().add(Common.day_remind, 'days');

        if (dateNow.isSameOrAfter(dateExpired)) {
          taskReminds.push(todoTask);
        }
      }
    }

    return taskReminds;
  };

  refreshToken = async (implementedTodoApp: IImplementedTodoApp): Promise<ITodoAppUser | null> => {
    const ternantId = implementedTodoApp.tenant_id;
    const todoAppUserData = this.microsoftRequest.getTodoAppUser();

    if (ternantId && todoAppUserData) {
      const url = 'https://login.microsoftonline.com/' + ternantId + '/oauth2/v2.0/token';
      const body = {
        client_id: implementedTodoApp.application_id,
        scope: 'https%3A%2F%2Fads.microsoft.com%2Fmsads.manage',
        refresh_token: todoAppUserData.refresh_token,
        grant_type: 'refresh_token',
        client_secret: implementedTodoApp.client_secret,
      };

      const response = await fetchApi(url, 'POST', body);
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

        return null;
      }
    }
  };

  createTodo = async (todoAppUser: ITodoAppUser, taskReminds: any): Promise<void> => {
    if (!taskReminds.length) return;

    const dataTodos = [];
    for (const todoTask of taskReminds) {
      const todoData = new Todo();
      todoData.name = todoTask.title;
      todoData.todoapp_id = todoAppUser.todoapp_id;
      todoData.todoapp_reg_id = todoTask.id;
      todoData.todoapp_reg_created_by = null;
      todoData.todoapp_reg_created_at = moment(todoTask.createdDateTime).toDate();
      todoData.assigned_user_id = todoAppUser.employee_id;
      todoData.deadline = moment.utc(todoTask.dueDateTime.dateTime).toDate();
      todoData.is_done = todoTask.status === 'completed';
      todoData.is_reminded = todoTask.isReminderOn;
      todoData.is_rescheduled = null;
      dataTodos.push(todoData);
    }

    const response = await this.todoRepository.upsert(dataTodos, []);
    if (response) {
      //push Line
    }
  };

  updateTodo = async (todoTask: IMicrosoftTask): Promise<void> => {
    const todo = await this.todoRepository.findOneBy({
      todoapp_reg_id: todoTask.id,
    });
    if (todo) {
      todo.name = todoTask.title;
      todo.deadline = moment.utc(todoTask.dueDateTime.dateTime).toDate();
      todo.is_done = todoTask.status === Common.completed;
      await this.todoRepository.save(todo);
    }
  };

  getAccessToken = async (): Promise<any> => {
    try {
      const authResponse = await getToken(tokenRequest);
      const accessToken = authResponse.accessToken;
      this.microsoftRequest.setAuth(accessToken);
      const users = await this.microsoftRequest.fetchApi('users', 'GET', {});
      return users;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };
}
