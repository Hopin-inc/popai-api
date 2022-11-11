import { Route, Controller } from 'tsoa';
import {
  WebhookEvent,
  FlexMessage,
  TextMessage,
  PostbackEvent,
  MessageAPIResponseBase,
} from '@line/bot-sdk';

import { User } from '../entify/user.entity';
import { LineMessageBuilder } from '../common/line_message';
import { LineBot } from '../config/linebot';
import LineRepository from '../repositories/line.repository';
import Container from 'typedi';
import {
  ChatToolCode,
  LINEID_MESSAGE,
  MessageTriggerType,
  MessageType,
  OpenStatus,
  ReplyStatus,
  SenderType,
  TaskStatus,
} from '../const/common';
import { ChatMessage } from '../entify/message.entity';
import moment from 'moment';
import logger from './../logger/winston';
import { LoggerError } from '../exceptions';
import { toJapanDateTime } from '../utils/common';
import { ChatTool } from '../entify/chat_tool.entity';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import CommonRepository from './../repositories/modules/common.repository';
import { IUser } from './../types';

@Route('line')
export default class LineController extends Controller {
  private lineRepository: LineRepository;
  private chattoolRepository: Repository<ChatTool>;
  private commonRepository: CommonRepository;

  constructor() {
    super();
    this.lineRepository = Container.get(LineRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
  }

  public async handlerEvents(events: Array<WebhookEvent>): Promise<any> {
    events.map(async (event) => await this.handleEvent(event));

    return {
      message: 'line webhook',
    };
  }

  /**
   * Handle webhook event
   * @param event WebhookEvent
   * @returns
   */
  private async handleEvent(event: WebhookEvent): Promise<any> {
    try {
      const chattool = await this.chattoolRepository.findOneBy({
        tool_code: ChatToolCode.LINE,
      });

      if (!chattool) {
        logger.error(new LoggerError('LINE is not implemented yet!'));
        return;
      }

      const lineId = event.source.userId;

      switch (event.type) {
        case 'follow':
          // LINE Official Account is added as a friend
          // eslint-disable-next-line no-case-declarations
          const lineProfile = await LineBot.getProfile(lineId);
          await this.lineRepository.createLineProfile(lineProfile);

          await this.replyClientId(event.replyToken, lineId);

          break;

        case 'postback':
          // eslint-disable-next-line no-case-declarations
          const postData = JSON.parse(event.postback.data);
          if (postData.todo && postData.status) {
            this.updateIsReplyFlag(postData);

            const superiorUsers = await this.lineRepository.getSuperiorUsers(lineId);

            if (superiorUsers.length == 0) {
              if (postData.status == TaskStatus.DONE) {
                this.replyDoneAction(event.replyToken, '');
              } else {
                this.replyDeplayAction(event.replyToken);
              }
            } else {
              superiorUsers.map((superiorUser) => {
                if (postData.status == TaskStatus.DONE) {
                  this.replyDoneAction(event.replyToken, superiorUser.name);
                } else {
                  this.replyDeplayAction(event.replyToken);
                }
                this.saveChatMessage(chattool, postData, event, MessageTriggerType.REPLY);

                this.sendSuperiorMessage(
                  chattool,
                  superiorUser,
                  postData.user_name,
                  postData.todo.name,
                  postData.message
                );
              });
            }
          }

          break;

        case 'message':
          // eslint-disable-next-line no-case-declarations
          const message: any = event.message;
          if (message.text.toLowerCase() == LINEID_MESSAGE) {
            await this.replyClientId(event.replyToken, lineId);
          } else {
            const unknownMessage = LineMessageBuilder.createUnKnownMessage();
            await this.lineRepository.replyMessage(event.replyToken, unknownMessage);
          }

          break;
      }

      return;
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Save chat message
   * @param postData
   * @param event
   * @returns
   */
  private async saveChatMessage(
    chattool: ChatTool,
    postData: any,
    event: PostbackEvent,
    messageTriggerId: number
  ): Promise<ChatMessage> {
    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = SenderType.FROM_USER;
    chatMessage.chattool_id = chattool.id;
    chatMessage.is_openned = OpenStatus.OPENNED;
    chatMessage.is_replied = ReplyStatus.NOT_REPLIED;
    chatMessage.message_trigger_id = messageTriggerId; // reply
    chatMessage.message_type_id = MessageType.TEXT;

    chatMessage.body = postData.message;
    chatMessage.todo_id = postData.todo.id;
    chatMessage.send_at = toJapanDateTime(
      moment()
        .utc()
        .toDate()
    );
    chatMessage.message_token = event.replyToken;
    chatMessage.user_id = postData.todo.assigned_user_id;
    chatMessage.parent_message_id = postData.parent_message_id;

    return await this.lineRepository.createMessage(chatMessage);
  }

  /**
   *
   * @param replyToken
   * @param lineId
   * @returns
   */
  private async replyClientId(replyToken: string, lineId: string): Promise<MessageAPIResponseBase> {
    const textMessage: TextMessage = {
      type: 'text',
      text: 'あなたのLineIDをお知らせます。\n' + lineId,
    };
    return await this.lineRepository.replyMessage(replyToken, textMessage);
  }

  /**
   *
   * @param replyToken
   * @param superior
   * @returns
   */
  private async replyDoneAction(
    replyToken: string,
    superior?: string
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = LineMessageBuilder.createReplyDoneMessage(superior);
    return await this.lineRepository.replyMessage(replyToken, replyMessage);
  }

  /**
   *
   * @param replyToken
   * @returns
   */
  private async replyDeplayAction(replyToken: string): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = LineMessageBuilder.createDeplayReplyMessage();

    return await this.lineRepository.replyMessage(replyToken, replyMessage);
  }

  private async updateIsReplyFlag(postData: any) {
    if (postData.parent_message_id) {
      const message = await this.lineRepository.findMessageById(postData.parent_message_id);

      if (message) {
        message.is_replied = ReplyStatus.REPLIED;

        await this.lineRepository.createMessage(message);
      }
    }
  }

  /**
   *
   * @param superiorUser
   * @param userName
   * @param taskName
   * @param reportContent
   * @returns
   */
  private async sendSuperiorMessage(
    chattool: ChatTool,
    superiorUser: IUser,
    userName: string,
    taskName: string,
    reportContent: string
  ): Promise<MessageAPIResponseBase> {
    const chatToolUser = await this.commonRepository.getChatToolUser(superiorUser.id, chattool.id);
    const user = { ...superiorUser, line_id: chatToolUser?.auth_key };

    if (!chatToolUser?.auth_key) {
      logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));

      return;
    }

    await this.lineRepository.pushStartReportToSuperior(chattool, user);

    const reportMessage: FlexMessage = LineMessageBuilder.createReportToSuperiorMessage(
      user.name,
      userName,
      taskName,
      reportContent
    );
    return await this.lineRepository.pushLineMessage(
      chattool,
      user,
      reportMessage,
      MessageTriggerType.ACTION
    );
  }
}
