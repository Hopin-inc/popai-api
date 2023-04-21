import { Service } from "typedi";
import { IncomingWebhook, IncomingWebhookSendArguments } from "@slack/webhook";
import Account from "@/entities/settings/Account";
import { KnownBlock, MessageAttachment } from "@slack/web-api";

@Service()
export default class SlackInternalWebhookClient {
  private webhook: IncomingWebhook;

  constructor() {
    this.webhook = new IncomingWebhook(process.env.INTERNAL_SLACK_WEBHOOK_URL);
  }

  private async post(options: IncomingWebhookSendArguments) {
    await this.webhook.send(options);
  }

  public async notifyOnAccountCreated(account: Account) {
    const { company, name, email } = account;
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: "ユーザーが登録されました。" },
    }];
    const attachments: MessageAttachment[] = [{
      color: "good",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*${ company.name }* ${ name }さま` },
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: email }],
        },
      ],
    }];
    await this.post({ blocks, attachments });
  }
}
