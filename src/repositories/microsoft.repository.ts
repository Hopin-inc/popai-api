import { InternalServerErrorException } from '../exceptions';
import { Repository } from 'typeorm';
import {
  IImplementedTodoApp,
  IMicrosoftRefresh,
  IMicrosoftTask,
  ITodo,
  ITodoAppUser,
  IUser,
} from './../types';
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
      throw new InternalServerErrorException(error.message);
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
      const taskReminds = await this.findTaskRemind(user, todoTaskLists['value'] || []);
      this.createTodo(user, todoAppUser, taskReminds);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  findTaskRemind = async (
    user: IUser,
    todoTaskLists: IMicrosoftTask[]
  ): Promise<IMicrosoftTask[]> => {
    const taskReminds: IMicrosoftTask[] = [];
    const dayRemind: number = user.companyCondition?.remind_before_days || Common.day_remind;

    for (const todoTask of todoTaskLists) {
      if (todoTask.dueDateTime && todoTask.status !== Common.completed) {
        const dueDate = todoTask.dueDateTime.dateTime;
        const dateExpired = moment(dueDate);
        const dateNow = moment().add(dayRemind, 'days');

        if (dateNow.isSameOrAfter(dateExpired)) {
          taskReminds.push(todoTask);
        }
      } else {
        this.updateTodo(todoTask);
      }
    }

    return taskReminds;
  };

  refreshToken = async (dataRefresh: IMicrosoftRefresh): Promise<ITodoAppUser | null> => {
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

      return null;
    }
  };

  createTodo = async (
    user: IUser,
    todoAppUser: ITodoAppUser,
    taskReminds: IMicrosoftTask[]
  ): Promise<void> => {
    if (!taskReminds.length) return;

    const dataTodos = [];
    const dataTodoIDUpdates = [];

    for (const todoTask of taskReminds) {
      const todoData = new Todo();
      todoData.name = todoTask.title;
      todoData.todoapp_id = todoAppUser.todoapp_id;
      todoData.todoapp_reg_id = todoTask.id;
      todoData.todoapp_reg_url = Common.microsoftBaseUrl.concat('/', todoTask.id);
      todoData.todoapp_reg_created_by = null;
      todoData.todoapp_reg_created_at = moment(todoTask.createdDateTime).toDate();
      todoData.assigned_user_id = todoAppUser.employee_id;
      todoData.deadline = moment.utc(todoTask.dueDateTime.dateTime).toDate();
      todoData.is_done = todoTask.status === Common.completed;
      todoData.is_reminded = todoTask.isReminderOn;
      todoData.is_rescheduled = null;
      dataTodos.push(todoData);

      // send Line message
      this.lineBotRepository.pushMessageRemind(user, todoData);

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
  };

  updateTodo = async (todoTask: IMicrosoftTask): Promise<void> => {
    const todoData = await this.todoRepository.findOneBy({
      todoapp_reg_id: todoTask.id,
    });
    if (todoData) {
      todoData.name = todoTask.title;
      todoData.todoapp_reg_url = Common.microsoftBaseUrl.concat('/', todoTask.id);
      todoData.deadline = moment.utc(todoTask.dueDateTime.dateTime).toDate();
      todoData.is_done = todoTask.status === Common.completed;
      const todo = await this.todoRepository.save(todoData);
      if (todo && todoTask.lastModifiedDateTime) {
        this.saveTodoHistory(todo, moment(todoTask.lastModifiedDateTime).toDate());
      }
    }
  };

  saveTodoHistory = async (todo: ITodo, updateTime: Date) => {
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
  };

  getAccessToken = async (): Promise<any> => {
    try {
      //get access token
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };
}
