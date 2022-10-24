import { InternalServerErrorException } from '../exceptions';
import { Service } from 'typedi';
import { LineMessageBuilder } from '../common/line_message';
import { Todo } from '../entify/todo.entity';
import { IUser } from '../types';
import { LineBot } from '../config/linebot';

@Service()
export default class LineAppRepository {
  pushMessageRemind = async (user: IUser, todo: Todo): Promise<any> => {
    try {
      if (!user.line_id) {
        return;
      }

      const message = LineMessageBuilder.createRemindMessage(
        user.name,
        todo.name,
        'https://trello.com/c/hocBjFOc/1-test1'
      );

      return await LineBot.pushMessage(user.line_id, message);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };
}
