import { InternalServerErrorException } from '../exceptions';
import { Service } from 'typedi';
import { LineMessageBuilder } from '../common/line_message';
import { Todo } from '../entify/todo.entity';
import { IUser } from '../types';
import { LineBot } from '../config/linebot';

import { AppDataSource } from '../config/data-source';
import { Profile } from '@line/bot-sdk';
import { LineProfile } from '../entify/line_profile.entity';
import { ReportingLine } from '../entify/reporting_lines.entity';
import { User } from '../entify/user.entity';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entify/message.entity';

@Service()
export default class LineRepository {
  private lineProfileRepository: Repository<LineProfile>;
  private userRepositoty: Repository<User>;
  private messageRepository: Repository<ChatMessage>;

  constructor() {
    this.lineProfileRepository = AppDataSource.getRepository(LineProfile);
    this.userRepositoty = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
  }

  pushMessageRemind = async (user: IUser, todo: Todo): Promise<any> => {
    try {
      if (!user.line_id) {
        return;
      }

      const message = LineMessageBuilder.createRemindMessage(user.name, todo);

      return await LineBot.pushMessage(user.line_id, message);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  pushStartReportToAdmin = async (user: IUser): Promise<any> => {
    try {
      if (!user.line_id) {
        return;
      }

      const superiorUsers = await this.getSuperiorUsers(user.line_id);

      superiorUsers.map(async (superiorUser) => {
        const message = LineMessageBuilder.createStartReportToSuperiorMessage(superiorUser.name);

        await LineBot.pushMessage(superiorUser.line_id, message);
      });

      return;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  createLineProfile = async (lineProfile: Profile): Promise<LineProfile> => {
    try {
      const findResult = await this.lineProfileRepository.findOneBy({
        line_id: lineProfile.userId,
      });

      if (!findResult) {
        const profile = new LineProfile();
        profile.line_id = lineProfile.userId;
        profile.display_name = lineProfile.displayName;
        profile.picture_url = lineProfile.pictureUrl;
        profile.status_message = lineProfile.statusMessage;

        return await this.lineProfileRepository.save(profile);
      } // find by id

      return findResult;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  getSuperiorUsers = async (lineId: string): Promise<Array<User>> => {
    // Get userinfo
    const userInfo = await this.userRepositoty.findOneBy({ line_id: lineId });

    if (!userInfo) {
      return Promise.resolve([]);
    }

    // Get supervisords

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingLineRepository.findBy({
      subordinate_user_id: userInfo.id,
    });

    if (superiorUserIds.length == 0) {
      return Promise.resolve([]);
    }

    const superiorUsers = await this.userRepositoty
      .createQueryBuilder('users')
      .where('id IN (:...ids)', {
        ids: superiorUserIds.map((superiorUserId) => superiorUserId.superior_user_id),
      })
      .getMany();

    return superiorUsers;
  };

  createMessage = async (chatMessage: ChatMessage): Promise<ChatMessage> => {
    try {
      return await this.messageRepository.save(chatMessage);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };
}
