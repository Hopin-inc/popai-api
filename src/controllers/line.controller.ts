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

@Route('line')
export default class LineController extends Controller {
  @Post('/send_message')
  public async sendMessage(
    client: Client,
    lineId: string,
    userName: string,
    taskName: string,
    taskUrl: string
  ): Promise<any> {
    const message = LineMessageBuilder.createRemindMessage(userName, taskName, taskUrl);
    const result = await client.pushMessage(lineId, message);

    return {
      message: 'ok',
      result: result,
    };
  }

  @Post('/webhook')
  public async handlerEvents(client: Client, events: Array<WebhookEvent>): Promise<any> {
    // console.log(req);

    await events.map(async (event) => await this.handleEvent(client, event));

    return {
      message: 'line webhook',
    };
  }

  // event handler
  private async handleEvent(client: Client, event: WebhookEvent) {
    console.log(JSON.stringify(event));

    const lineId = event.source.userId;

    console.log('userId:' + lineId);

    switch (event.type) {
      case 'follow': // LINE Official Account is added as a friend
        // eslint-disable-next-line no-case-declarations
        const lineProfile = await client.getProfile(lineId);

        console.log(JSON.stringify(lineProfile));
        await createLineProfile(lineProfile);

        break;

      case 'message':
        // eslint-disable-next-line no-case-declarations
        const message: any = event.message;

        await createMessage(message);

        if (message.text == 'lineid') {
          return this.replyClientId(client, event.replyToken, lineId);
        }

        // quick reply
        if (message.text.startsWith('完了しております')) {
          const superiorUsers = await getSuperiorUsers(lineId);
          superiorUsers.map((superiorUser) => {
            this.replyDoneAction(client, event.replyToken, superiorUser.name);
            this.sendSuperiorMessage(client, superiorUser, message.text);
          });
        }

        if (message.text.startsWith('すみません、遅れております')) {
          this.replyDeplayAction(client, event.replyToken);

          const superiorUsers = await getSuperiorUsers(lineId);
          superiorUsers.map((superiorUser) => {
            this.sendSuperiorMessage(client, superiorUser, message.text);
          });
        }
        break;
    }

    return;
  }

  private async replyClientId(client: Client, replyToken: string, lineId: string) {
    const textMessage: TextMessage = { type: 'text', text: lineId };
    return client.replyMessage(replyToken, textMessage);
  }

  private async replyDoneAction(client: Client, replyToken: string, superior: string) {
    const replyMessage: FlexMessage = LineMessageBuilder.createReplyDoneMessage(superior);
    return client.replyMessage(replyToken, replyMessage);
  }

  private async replyDeplayAction(client: Client, replyToken: string) {
    const replyMessage: FlexMessage = LineMessageBuilder.createDeplayReplyMessage();

    return client.replyMessage(replyToken, replyMessage);
  }

  private async sendSuperiorMessage(client: Client, superiorUser: User, reportContent: string) {
    const reportMessage: FlexMessage = LineMessageBuilder.createReportToSuperiorMessage(
      superiorUser.name,
      reportContent
    );
    return client.pushMessage(superiorUser.line_id, reportMessage);
  }
}
