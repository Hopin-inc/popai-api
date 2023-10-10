import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import { Installation } from "@slack/oauth";
import { ChatToolId } from "../../consts/common";
import { InstallationLineWorks } from "@/types/lineworks";

@Entity("s_implemented_chat_tools")
export default class ImplementedChatTool extends BaseEntity {
  constructor(
    company: Company | string,
    chatToolId: number,
    installation?: Installation | InstallationLineWorks,
    appInstallUserId?: string,
    clientId?: string,
    clientSecret?: string,
    serviceAccount?: string,
    secretKey?: string,
    userBotId?: string,
    userBotSecret?: string,
    channelBotId?: string,
    channelBotSecret?: string,
  ) {
    super();
    if (company) {
      this.companyId = typeof company === "string" ? company : company.id;
      this.chatToolId = chatToolId;
      switch (this.chatToolId) {
        case ChatToolId.SLACK:
          if (installation) {
            this.installation = installation as Installation;
            this.appTeamId = this.installation.team.id;
            this.accessToken = this.installation.bot.token;
          } else if (appInstallUserId) {
            this.appInstallUserId = appInstallUserId;
          }
          break;
        case ChatToolId.LINEWORK:
          if (installation) {
            this.installation = installation as InstallationLineWorks;
            this.accessToken = this.installation.access_token;
            this.refreshToken = this.installation.refresh_token;
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            this.serviceAccount = serviceAccount;
            this.secretKey = secretKey;
            this.userBotId = userBotId;
            this.userBotSecret = userBotSecret;
            this.channelBotId = channelBotId;
            this.channelBotSecret = channelBotSecret;
          }
          break;
        default:
          break;
      }
    }
  }

  @PrimaryColumn({ name: "company_id" })
  companyId: string;

  @Column({ name: "chat_tool_id" })
  chatToolId: number;

  @Column({ name: "app_team_id", type: "varchar", length: 12, nullable: true })
  appTeamId?: string;

  @Column({ name: "app_install_user_id", type: "varchar", length: 12, nullable: true })
  appInstallUserId?: string;

  @Column({ name: "access_token", type: "text", nullable: true })
  accessToken?: string;

  @Column({ name: "installation", type: "json", nullable: true })
  installation?: Installation | InstallationLineWorks;

  @Column({ name: "refresh_token", type: "text", nullable: true })
  refreshToken?: string;

  @Column({ name: "client_id", type: "varchar", length: 50, nullable: true })
  clientId?: string;

  @Column({ name: "client_secret", type: "varchar", length: 50, nullable: true })
  clientSecret?: string;

  @Column({ name: "service_account", type: "varchar", length: 50, nullable: true })
  serviceAccount?: string;

  @Column({ name: "secret_key", type: "text", nullable: true })
  secretKey?: string;

  @Column({ name: "user_bot_id", type: "varchar", nullable: true })
  userBotId?: string;

  @Column({ name: "user_bot_secret", type: "text", nullable: true })
  userBotSecret?: string;
  
  @Column({ name: "channel_bot_id", type: "varchar", nullable: true })
  channelBotId?: string;

  @Column({ name: "channel_bot_secret", type: "text", nullable: true })
  channelBotSecret?: string;

  @OneToOne(() => Company, (company) => company.implementedChatTool, {
    onDelete: "CASCADE",
    onUpdate: "RESTRICT",
  })
  @JoinColumn({ name: "company_id" })
  company: Company;
}
