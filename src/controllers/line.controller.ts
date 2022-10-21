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
} from '@line/bot-sdk';

import { createLineProfile } from '../repositories/line_bot.repository';
import { createMessage } from '../repositories/message.repository';

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
    const message: FlexMessage = {
      type: 'flex',
      altText: 'This is a Flex Message',
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

    const userId = event.source.userId;

    console.log('userId:' + userId);

    switch (event.type) {
      case 'follow': // LINE Official Account is added as a friend
        const lineProfile = await client.getProfile(userId);

        console.log(JSON.stringify(lineProfile));
        await createLineProfile(lineProfile);

        break;

      case 'message':
        const message: any = event.message;

        await createMessage(message);

        if (message.text == 'lineid') {
          const textMessage: TextMessage = { type: 'text', text: userId };
          return client.replyMessage(event.replyToken, textMessage);
        }
        break;
    }

    return;
  }
}
