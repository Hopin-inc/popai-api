import { Service } from "typedi";
import { InstallProvider, InstallProviderOptions } from "@slack/oauth";
import { Request, Response } from "express";
import { SessionRepository } from "@/repositories/transactions/SessionRepository";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import ImplementedChatTool from "@/entities/settings/ImplementedChatTool";
import { ChatToolId } from "@/consts/common";
import Company from "@/entities/settings/Company";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { auth } from "@/libs/firebase";
import logger from "@/libs/logger";

const scopes: string[] = [
  "channels:history", "channels:join", "channels:read",
  "chat:write",
  "conversations.connect:write",
  "groups:history", "groups:read",
  "im:history", "im:write",
  "team:read",
  "users.profile:read",
  "users:read",
];
const userScopes: string[] = [
  "openid",
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
      directInstall: true,
      installationStore: {
        storeInstallation: async installation => {
          try {
            const sessionId = installation.metadata;
            const session = await SessionRepository.getSessionDataById(sessionId);
            let implementedChatTool: ImplementedChatTool;
            if (session?.company) {
              implementedChatTool = new ImplementedChatTool(session?.company, ChatToolId.SLACK, installation);
            } else {
              const authUser = await auth.createUser({});
              const company = await CompanyRepository.save(new Company(authUser.uid));
              implementedChatTool = new ImplementedChatTool(company, ChatToolId.SLACK, installation);
            }
            await ImplementedChatToolRepository.upsert(implementedChatTool, []);
          } catch (error) {
            logger.error(error.message, error);
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
      userScopes,
      redirectUri: `${ req.protocol }://${ req.get("host") }/api/slack/oauth_redirect`,
      metadata: req.session.id,
    });
  }

  public async handleCallback(req: Request, res: Response) {
    await this.slackInstaller.handleCallback(req, res, {
      success() {
        res.redirect(`${ process.env.CLIENT_BASE_URL }/create-account`);
      },
      failure(error) {
        logger.error(error.message, error);
        res.redirect(`${ process.env.CLIENT_BASE_URL }/login`);
      },
    }, { scopes });
  }
}
