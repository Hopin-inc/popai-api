import { getToken, tokenRequest } from '../config/microsoft';
import { InternalServerErrorException } from '../exceptions';
import { fetchGraphApi } from '../libs/request';
import { Repository } from 'typeorm';
import { IUser } from './../types';
import { AppDataSource } from './../config/data-source';
import { User } from './../entify/user.entity';
import { Service } from 'typedi';

@Service()
export default class MicrosoftRepository {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
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
        console.log('user', user);
      }
    }
  };
  getAccessToken = async (): Promise<any> => {
    try {
      const authResponse = await getToken(tokenRequest);
      const accessToken = authResponse.accessToken;
      const users = await fetchGraphApi('users', 'GET', {}, accessToken);
      return users;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };
}
