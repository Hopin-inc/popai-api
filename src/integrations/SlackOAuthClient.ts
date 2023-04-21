import { Service } from "typedi";
import { InstallProvider, InstallProviderOptions } from "@slack/oauth";
import { Request, Response } from "express";
import { SessionRepository } from "@/repositories/transactions/SessionRepository";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import ImplementedChatTool from "@/entities/settings/ImplementedChatTool";
import { ChatToolId } from "@/consts/common";

const scopes: string [] = [
  "channels:history", "channels:join", "channels:read",
  "chat:write",
  "conversations.connect:write",
  "im:history", "im:write",
  "incoming-webhook",
  "team:read",
  "users.profile:read",
  "users:read",
];

@Service()
export default class SlackOAuthClient {
  private readonly slackInstaller: InstallProvider;

  constructor() {
    const options: InstallProviderOptions = {
      authVersion: "v2",
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      stateSecret: process.env.SLACK_STATE_SECRET,
      installationStore: {
        storeInstallation: async installation => {
          const sessionId = installation.metadata;
          const session = await SessionRepository.getSessionDataById(sessionId);
          if (session) {
            const implementedChatTool = new ImplementedChatTool(session.company, ChatToolId.SLACK, installation);
            await ImplementedChatToolRepository.upsert(implementedChatTool, []);
          }
        },
        fetchInstallation: async query => {
          const { teamId } = query;
          const implementedChatTool = await ImplementedChatToolRepository.findOneBy({ appTeamId: teamId });
          if (implementedChatTool) {
            return {
              authVersion: "v2",
              enterprise: undefined,
              team: { id: teamId },
              user: {
                id: implementedChatTool.installation.user.id,
                scopes: implementedChatTool.installation.bot.scopes,
                token: implementedChatTool.accessToken,
              },
            };
          }
        },
      },
    };
    this.slackInstaller = new InstallProvider(options);
  }

  public async handleInstallPath(req: Request, res: Response) {
    return await this.slackInstaller.handleInstallPath(req, res, {}, {
      scopes,
      redirectUri: `${ req.protocol }://${ req.get("host") }/api/slack/oauth_redirect`,
      metadata: req.session.id,
    });
  }

  public async handleCallback(req: Request, res: Response) {
    await this.slackInstaller.handleCallback(req, res, {
      success() {
        res.redirect(`${ process.env.CLIENT_BASE_URL }/settings/connect/chat-tool`);
      },
      failure() {
        res.redirect(`${ process.env.CLIENT_BASE_URL }/settings/connect/chat-tool`);
      },
    }, { scopes });
  }
}
