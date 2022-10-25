import { Route, Controller, Post } from 'tsoa';
import { WebhookEvent, FlexMessage, TextMessage, PostbackEvent } from '@line/bot-sdk';

import { User } from '../entify/user.entity';
import { LineMessageBuilder } from '../common/line_message';
import { LineBot } from '../config/linebot';
import LineRepository from '../repositories/line.repository';
import Container from 'typedi';
import {
  IS_OPENED,
  IS_REPLIED,
  LINEID_MESSAGE,
  MessageType,
  SenderType,
  TaskStatus,
} from '../const/common';
import { ChatMessage } from '../entify/message.entity';
import moment from 'moment';

@Route('line')
export default class LineController extends Controller {
  private lineRepository: LineRepository;
  constructor() {
    super();
    this.lineRepository = Container.get(LineRepository);
  }

  public async handlerEvents(events: WebhookEvent[]): Promise<any> {
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
  private async handleEvent(event: WebhookEvent) {
    try {
      console.log(JSON.stringify(event));
      const lineId = event.source.userId;

      switch (event.type) {
        case 'follow':
          // LINE Official Account is added as a friend
          // eslint-disable-next-line no-case-declarations
          const lineProfile = await LineBot.getProfile(lineId);
          await this.lineRepository.createLineProfile(lineProfile);

          break;

        case 'postback':
          // eslint-disable-next-line no-case-declarations
          const postData = JSON.parse(event.postback.data);
          if (postData.todo && postData.status) {
            const superiorUsers = await this.lineRepository.getSuperiorUsers(lineId);

            superiorUsers.map((superiorUser) => {
              if (postData.status == TaskStatus.DONE) {
                this.replyDoneAction(event.replyToken, superiorUser.name);
              } else {
                this.replyDeplayAction(event.replyToken);
              }

              this.saveChatMessage(postData, event);

              this.sendSuperiorMessage(
                superiorUser,
                postData.user_name,
                postData.todo.name,
                postData.message
              );
            });
          }

          break;

        case 'message':
          // eslint-disable-next-line no-case-declarations
          const message: any = event.message;
          if (message.text.toLowerCase() == LINEID_MESSAGE) {
            return this.replyClientId(event.replyToken, lineId);
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
  private async saveChatMessage(postData: any, event: PostbackEvent) {
    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = SenderType.FROM_USER;
    chatMessage.chattool_id = 1;
    chatMessage.is_openned = IS_OPENED;
    chatMessage.is_replied = IS_REPLIED;
    chatMessage.message_trigger_id = 2; // reply
    chatMessage.message_type_id = MessageType.TEXT;

    chatMessage.body = postData.message;
    chatMessage.todo_id = postData.todo.id;
    chatMessage.send_at = moment().toDate();
    chatMessage.message_token = event.replyToken;
    chatMessage.user_id = postData.todo.assigned_user_id;

    return await this.lineRepository.createMessage(chatMessage);
  }

  /**
   *
   * @param replyToken
   * @param lineId
   * @returns
   */
  private async replyClientId(replyToken: string, lineId: string) {
    const textMessage: TextMessage = { type: 'text', text: lineId };
    return LineBot.replyMessage(replyToken, textMessage);
  }

  /**
   *
   * @param replyToken
   * @param superior
   * @returns
   */
  private async replyDoneAction(replyToken: string, superior: string) {
    const replyMessage: FlexMessage = LineMessageBuilder.createReplyDoneMessage(superior);
    return LineBot.replyMessage(replyToken, replyMessage);
  }

  /**
   *
   * @param replyToken
   * @returns
   */
  private async replyDeplayAction(replyToken: string) {
    const replyMessage: FlexMessage = LineMessageBuilder.createDeplayReplyMessage();

    return LineBot.replyMessage(replyToken, replyMessage);
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
    superiorUser: User,
    userName: string,
    taskName: string,
    reportContent: string
  ) {
    const reportMessage: FlexMessage = LineMessageBuilder.createReportToSuperiorMessage(
      superiorUser.name,
      userName,
      taskName,
      reportContent
    );
    return LineBot.pushMessage(superiorUser.line_id, reportMessage);
  }
}
