import { Controller, Post } from 'tsoa';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { LineBot } from '../config/linebot';
import { ChatTool } from '../entify/chat_tool.entity';
import { ChatToolCode } from '../const/common';
import logger from '../logger/winston';
import { LoggerError } from '../exceptions';
import { User } from "../entify/user.entity";
import { ChatToolUser } from "../entify/chattool.user.entity";

export default class RichMenuController extends Controller {
  private chattoolRepository: Repository<ChatTool>;
  private chattoolUserRepository: Repository<ChatToolUser>;
  private userRepository: Repository<User>;

  constructor() {
    super();
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
    this.chattoolUserRepository = AppDataSource.getRepository(ChatToolUser);
    this.userRepository = AppDataSource.getRepository(User);
  }

  @Post('/')
  public async updateRichMenu(demoRichMenuId: string): Promise<any> {
    const chattool = await this.chattoolRepository.findOneBy({
      tool_code: ChatToolCode.LINE,
    });

    if (!chattool) {
      logger.error(new LoggerError('LINE is not implemented yet!'));
      return;
    }

    // get rich menu
    try {
      await LineBot.getRichMenu(demoRichMenuId);
    } catch (err) {
      logger.error(new LoggerError('Demo rich menu id not found!'));
      throw new Error('Demo rich menu id not found!');
    }
    // get demo users
    const lineUsers = await this.chattoolUserRepository
      .createQueryBuilder('chat_tool_users')
      .innerJoinAndSelect('chat_tool_users.user', 'user')
      .innerJoinAndSelect('user.company', 'company')
      // .where('company.is_demo = :is_demo', { is_demo: true })
      .andWhere('chat_tool_users.chattool_id = :chattool_id', { chattool_id: chattool.id })
      .andWhere('chat_tool_users.auth_key is not null')
      .getMany();

    const demolineIds = lineUsers
      .filter(lineUser => lineUser.user.company.is_demo)
      .map(lineUser => lineUser.auth_key);

    const defaultlineIds = lineUsers
      .filter(lineUser => !lineUser.user.company.is_demo)
      .map(lineUser => lineUser.auth_key);

    // set default rich menu
    // await LineBot.setDefaultRichMenu(defaultRichMenuId);

    // unlink
    if (defaultlineIds.length) {
      await LineBot.unlinkRichMenusFromMultipleUsers(defaultlineIds);
    }

    // set demo reich menu
    if (demolineIds.length) {
      await LineBot.linkRichMenuToMultipleUsers(demoRichMenuId, demolineIds);
    }

    return;
  }
}
