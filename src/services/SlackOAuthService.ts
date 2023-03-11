import { Service } from "typedi";
import { InstallProvider, InstallProviderOptions } from "@slack/oauth";
import { Request, Response } from "express";
import ImplementedChatTool from "@/entities/settings/ImplementedChatTool";
import { Repository } from "typeorm";
import AppDataSource from "@/config/data-source";

const options: InstallProviderOptions = {
  authVersion: "v2",
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  installationStore: {
    storeInstallation: async installation => {
      console.log(JSON.stringify(installation));
    },
    fetchInstallation: async _query => {
      return {
        authVersion: "v2",
        enterprise: undefined,
        team: { id: "" },
        user: { id: "", scopes: [], token: "" },
      };
    },
  },
};
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
export default class SlackOAuthService {
  private readonly slackInstaller: InstallProvider;
  private readonly implementedChatToolRepository: Repository<ImplementedChatTool>;

  constructor() {
    this.slackInstaller = new InstallProvider(options);
    this.implementedChatToolRepository = AppDataSource.getRepository(ImplementedChatTool);
  }

  public async generateInstallUrl(state: string) {
    return await this.slackInstaller.generateInstallUrl({ scopes }, true, state);
  }

  public async handleCallback(req: Request, res: Response) {
    await this.slackInstaller.handleCallback(req, res, {});
  }
}