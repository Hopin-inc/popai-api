import { AppDataSource } from '../config/data-source';
import { User } from '../entify/user.entity';
import { fetchTrelloApi } from '../libs/request';
import { InternalServerErrorException } from '../exceptions';

export const getBoard = async (): Promise<Array<any>> => {
  try {
    const data = await fetchTrelloApi('members/me/boards', 'GET');
    return data;
  } catch (error) {
    throw new InternalServerErrorException(error.message);
  }
};

export const getUsers = async (): Promise<Array<User>> => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    return userRepository.find();
  } catch (error) {
    throw new InternalServerErrorException(error.message);
  }
};
