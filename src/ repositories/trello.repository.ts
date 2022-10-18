import { AppDataSource } from '../config/data-source';
import { User } from '../entify/user.entity';
import { fetchTrelloApi } from './../libs/request';
import { TrelloAPI } from './../const/api';
import { InternalServerErrorException } from './../exceptions';

export const getBoard = async (): Promise<Array<any>> => {
  try {
    const data = await fetchTrelloApi(TrelloAPI.board, 'GET');
    return data;
  } catch (error) {
    throw new InternalServerErrorException();
  }
};

export const getUsers = async (): Promise<Array<User>> => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    return userRepository.find();
  } catch (error) {
    throw new InternalServerErrorException();
  }
};
