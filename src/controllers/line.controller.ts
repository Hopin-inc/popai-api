import { Get, Route, Controller, Post } from 'tsoa';
import { WebhookEvent, FlexMessage, TextMessage } from '@line/bot-sdk';

import { User } from '../entify/user.entity';
import { LineMessageBuilder } from '../common/line_message';
import { LineBot } from '../config/linebot';
import LineRepository from '../repositories/line.repository';
import Container from 'typedi';
import { TaskStatus } from '../const/common';
import { ChatMessage } from '../entify/message.entity';
import moment from 'moment';

@Route('line')
export default class LineController extends Controller {
  private lineRepository: LineRepository;
  constructor() {
    super();
    this.lineRepository = Container.get(LineRepository);
  }

  public async handlerEvents(events: Array<WebhookEvent>): Promise<any> {
    events.map(async (event) => await this.handleEvent(event));

    return {
      message: 'line webhook',
    };
  }

  // event handler
  private async handleEvent(event: WebhookEvent) {
    try {
      console.log(JSON.stringify(event));

      const lineId = event.source.userId;

      console.log('userId:' + lineId);

      switch (event.type) {
        case 'follow': // LINE Official Account is added as a friend
          // eslint-disable-next-line no-case-declarations
          const lineProfile = await LineBot.getProfile(lineId);

          console.log(JSON.stringify(lineProfile));
          await this.lineRepository.createLineProfile(lineProfile);

          break;

        case 'postback':
          console.log('postback');
          console.log(JSON.stringify(event));
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

              const chatMessage = new ChatMessage();
              chatMessage.is_from_user = 1;
              chatMessage.chattool_id = 1;
              chatMessage.is_openned = 1;
              chatMessage.is_replied = 1;
              chatMessage.message_trigger_id = 2; // reply

              chatMessage.body = postData.message; // re
              chatMessage.todo_id = postData.todo.id;
              chatMessage.send_at = moment().toDate();
              chatMessage.message_token = event.replyToken;
              chatMessage.user_id = postData.todo.assigned_user_id;

              this.lineRepository.createMessage(chatMessage);

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
          if (message.text == 'lineid') {
            return this.replyClientId(event.replyToken, lineId);
          }

          break;
      }

      return;
    } catch (error) {
      console.error(error);
    }
  }

  private async replyClientId(replyToken: string, lineId: string) {
    const textMessage: TextMessage = { type: 'text', text: lineId };
    return LineBot.replyMessage(replyToken, textMessage);
  }

  private async replyDoneAction(replyToken: string, superior: string) {
    const replyMessage: FlexMessage = LineMessageBuilder.createReplyDoneMessage(superior);
    return LineBot.replyMessage(replyToken, replyMessage);
  }

  private async replyDeplayAction(replyToken: string) {
    const replyMessage: FlexMessage = LineMessageBuilder.createDeplayReplyMessage();

    return LineBot.replyMessage(replyToken, replyMessage);
  }

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
