import { Get, Route, Controller, Post } from 'tsoa';
import {
  // main APIs
  Client,
  middleware,

  // exceptions
  JSONParseError,
  SignatureValidationFailed,

  // types
  TemplateMessage,
  WebhookEvent,
  FlexMessage,
  EventMessage,
  TextMessage,
  Message,
  QuickReplyItem,
  QuickReply,
} from '@line/bot-sdk';

import { createLineProfile, getSuperiorUsers } from '../repositories/line_bot.repository';
import { createMessage } from '../repositories/message.repository';
import { User } from '../entify/user.entity';
import { LineMessageBuilder } from '../common/line_message';
import { LineBot } from '../config/linebot';

@Route('line')
export default class LineController extends Controller {
  @Post('/send_message')
  public async sendMessage(
    lineId: string,
    userName: string,
    taskName: string,
    taskUrl: string
  ): Promise<any> {
    const message = LineMessageBuilder.createRemindMessage(userName, taskName, taskUrl);
    const result = await LineBot.pushMessage(lineId, message);

    return {
      message: 'ok',
      result: result,
    };
  }

  @Post('/webhook')
  public async handlerEvents(events: Array<WebhookEvent>): Promise<any> {
    events.map(async (event) => await this.handleEvent(event));

    return {
      message: 'line webhook',
    };
  }

  // event handler
  private async handleEvent(event: WebhookEvent) {
    console.log(JSON.stringify(event));

    const lineId = event.source.userId;

    console.log('userId:' + lineId);

    switch (event.type) {
      case 'follow': // LINE Official Account is added as a friend
        // eslint-disable-next-line no-case-declarations
        const lineProfile = await LineBot.getProfile(lineId);

        console.log(JSON.stringify(lineProfile));
        await createLineProfile(lineProfile);

        break;

      case 'message':
        // eslint-disable-next-line no-case-declarations
        const message: any = event.message;

        await createMessage(message);

        if (message.text == 'lineid') {
          return this.replyClientId(event.replyToken, lineId);
        }

        // quick reply
        if (message.text.startsWith('完了しております')) {
          const superiorUsers = await getSuperiorUsers(lineId);
          superiorUsers.map((superiorUser) => {
            this.replyDoneAction(event.replyToken, superiorUser.name);
            this.sendSuperiorMessage(superiorUser, message.text);
          });
        }

        if (message.text.startsWith('すみません、遅れております')) {
          this.replyDeplayAction(event.replyToken);

          const superiorUsers = await getSuperiorUsers(lineId);
          superiorUsers.map((superiorUser) => {
            this.sendSuperiorMessage(superiorUser, message.text);
          });
        }
        break;
    }

    return;
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

  private async sendSuperiorMessage(superiorUser: User, reportContent: string) {
    const reportMessage: FlexMessage = LineMessageBuilder.createReportToSuperiorMessage(
      superiorUser.name,
      reportContent
    );
    return LineBot.pushMessage(superiorUser.line_id, reportMessage);
  }
}
