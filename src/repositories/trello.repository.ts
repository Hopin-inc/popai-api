import { AppDataSource } from '../config/data-source';
import { User } from '../entify/user.entity';
import { InternalServerErrorException } from '../exceptions';
import { Repository } from 'typeorm';
import moment from 'moment';
import { Common } from './../const/common';
import { ITodoAppUser, IUser } from './../types';
import trelloRequest from './../libs/trello.request';
import { Service, Container } from 'typedi';

@Service()
export default class TrelloRepository {
  private userRepository: Repository<User>;
  private trelloRequest: trelloRequest;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.trelloRequest = Container.get(trelloRequest);
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
      if (todoAppUser.api_key && todoAppUser.api_token) {
        this.getCardRemindByUser(userId, todoAppUser);
      }
    }
  };

  getCardRemindByUser = async (userId: number, todoAppUser: ITodoAppUser): Promise<Array<any>> => {
    try {
      this.trelloRequest.setAuth(todoAppUser.api_key, todoAppUser.api_token);
      const data = await this.trelloRequest.fetchApi('members/me/cards', 'GET');
      const remindUsers = this.findCardRemind(data);

      return remindUsers;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  findCardRemind = (cards) => {
    if (!cards.length) return [];

    const card = cards.map(function(item) {
      if (item.due && !item.dueComplete) {
        const dateExpired = moment(item.due);
        const dateNow = moment().add(Common.day_remind, 'days');

        if (dateNow.isSameOrAfter(dateExpired)) {
          return item;
        }
      }
    });
    return card;
  };
}
