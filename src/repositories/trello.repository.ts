import { AppDataSource } from '../config/data-source';
import { User } from '../entify/user.entity';
import { fetchTrelloApi } from '../libs/request';
import { InternalServerErrorException } from '../exceptions';
import moment from 'moment';
import { Common } from './../const/common';

export const getBoard = async (): Promise<Array<any>> => {
  try {
    const data = await fetchTrelloApi('members/me/boards', 'GET');

    return data;
  } catch (error) {
    throw new InternalServerErrorException(error.message);
  }
};

export const getCardRemind = async (): Promise<Array<any>> => {
  try {
    const data = await fetchTrelloApi('members/me/cards', 'GET');
    const remind = findCardRemind(data);
    return remind;
  } catch (error) {
    throw new InternalServerErrorException(error.message);
  }
};

export const findCardRemind = (cards) => {
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

export const getUsers = async (): Promise<Array<User>> => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    return userRepository.find();
  } catch (error) {
    throw new InternalServerErrorException(error.message);
  }
};
