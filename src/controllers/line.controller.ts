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
import { User } from 'src/entify/user.entity';

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
    const quickReplyItems: QuickReply = {
      /**
       * This is a container that contains
       * [quick reply buttons](https://developers.line.biz/en/reference/messaging-api/#quick-reply-button-object).
       *
       * Array of objects (Max: 13)
       */
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '完了しております',
            text: '完了しております',
          },
        },

        {
          type: 'action',
          action: {
            type: 'message',
            label: 'すみません、遅れております',
            text: 'すみません、遅れております',
          },
        },
      ],
    };

    const message: FlexMessage = {
      type: 'flex',
      altText: '昨日までの' + taskName + 'の進捗はいかがですか？\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: userName + 'さん\n\n',
            },
            {
              type: 'text',
              text: '\nお疲れさまです\n\n',
            },
            {
              type: 'text',
              text: '昨日までの' + taskName + 'の進捗はいかがですか？\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '該当リンクはこちらです\n',
              wrap: true,
            },
            {
              type: 'text',
              text: taskUrl,
              wrap: true,
            },
          ],
        },
      },
      quickReply: quickReplyItems,
    };
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
        const message: any = event.message;

        await createMessage(message);

        if (message.text == 'lineid') {
          return this.replyClientId(client, event.replyToken, lineId);
        }

        // quick reply
        if (message.text === '完了しております') {
          const superiorUsers = await getSuperiorUsers(lineId);
          superiorUsers.map((superiorUser) => {
            this.replyDoneAction(client, event.replyToken, superiorUser.name);
            this.sendSuperiorMessage(client, superiorUser, message.text);
          });
        }

        if (message.text === 'すみません、遅れております') {
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
    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '当いただき担、ありがとうございます\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '完了しているんですね😌\n\n',
            },
            {
              type: 'text',
              text: 'お疲れさまでした！\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '当いただき担、ありがとうございます😭\n\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '{{上長(' + superior + ')}}さんに報告しておきますね💪\n',
              wrap: true,
            },
          ],
        },
      },
    };

    return client.replyMessage(replyToken, replyMessage);
  }

  private async replyDeplayAction(client: Client, replyToken: string) {
    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '当いただき担、ありがとうございます\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '承知しました😖\n',
            },
            {
              type: 'text',
              text: '引き続きよろしくお願いします💪\n',
            },
          ],
        },
      },
    };

    return client.replyMessage(replyToken, replyMessage);
  }

  private async sendSuperiorMessage(client: Client, superiorUser: User, reportContent: string) {
    const reportMessage: FlexMessage = {
      type: 'flex',
      altText: superiorUser.name + 'からのレポート\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '報告者：' + superiorUser.name + '\n',
            },
            {
              type: 'text',
              text: 'レポート内容：' + reportContent + '\n',
              wrap: true,
            },
          ],
        },
      },
    };

    return client.pushMessage(superiorUser.line_id, reportMessage);
  }
}
