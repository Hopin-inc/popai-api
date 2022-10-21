import { getToken, tokenRequest } from '../config/microsoft';
import { InternalServerErrorException } from '../exceptions';
import { Repository } from 'typeorm';
import { ITodoAppUser, IUser } from './../types';
import { AppDataSource } from './../config/data-source';
import { User } from './../entify/user.entity';
import microsoftRequest from './../libs/microsoft.request';
import { Service, Container } from 'typedi';
import moment from 'moment';
import { Common } from './../const/common';

@Service()
export default class MicrosoftRepository {
  private userRepository: Repository<User>;
  private microsoftRequest: microsoftRequest;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.microsoftRequest = Container.get(microsoftRequest);
  }

  remindUsers = async (companyId: number, todoappId: number): Promise<void> => {
    const users: IUser[] = await this.userRepository
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.todoAppUsers', 'todo_app_users')
      .where('users.company_id = :companyId', { companyId })
      .where('todo_app_users.todoapp_id = :todoappId', { todoappId })
      .getMany();

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

      const userTaskLists = await this.microsoftRequest.fetchApi('me/todo/lists', 'GET');
      if (userTaskLists && userTaskLists['value'].length) {
        for (const taskList of userTaskLists['value']) {
          this.getTodoTaskReminds(taskList);
        }
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  getTodoTaskReminds = async (taskList: any): Promise<void> => {
    try {
      //todo
      const todoTaskLists = await this.microsoftRequest.fetchApi(
        '/me/todo/lists/' + taskList.id + '/tasks',
        'GET'
      );
      const remindUsers = this.findTaskRemind(todoTaskLists['value'] || []);
      console.log('remind', remindUsers);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  findTaskRemind = (todoTaskLists: any): Promise<Array<any>> => {
    const taskReminds = todoTaskLists.map(function(todoTask) {
      if (todoTask.dueDateTime) {
        const dueDate = todoTask.dueDateTime.dateTime;
        const dateExpired = moment(dueDate);
        const dateNow = moment().add(Common.day_remind, 'days');

        if (dateNow.isSameOrAfter(dateExpired)) {
          return todoTask;
        }
      }
    });

    return taskReminds.filter((item: any) => item);
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
