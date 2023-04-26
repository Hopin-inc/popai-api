import { Service } from "typedi";
import { IncomingWebhook, IncomingWebhookSendArguments } from "@slack/webhook";
import { KnownBlock, MessageAttachment } from "@slack/web-api";
import Company from "@/entities/settings/Company";

@Service()
export default class SlackInternalWebhookClient {
  private webhook: IncomingWebhook;

  constructor() {
    this.webhook = new IncomingWebhook(process.env.INTERNAL_SLACK_WEBHOOK_URL);
  }

  private async post(options: IncomingWebhookSendArguments) {
    await this.webhook.send(options);
  }

  public async notifyOnAccountCreated(company: Company) {
    const { name, implementedChatTool } = company;
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: "ユーザーが登録されました。" },
    }];
    const attachments: MessageAttachment[] = [{
      color: "good",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*${ name }* (${ implementedChatTool.chatToolId })` },
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `team_id: ${ implementedChatTool.appTeamId }` }],
        },
      ],
    }];
    await this.post({ blocks, attachments });
  }
}
