import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import { Installation } from "@slack/oauth";
import { ChatToolId } from "../../consts/common";

@Entity("s_implemented_chat_tools")
export default class ImplementedChatTool extends BaseEntity {
  constructor(
    company: Company | string,
    chatToolId: number,
    installation?: Installation,
    appInstallUserId?: string,
  ) {
    super();
    if (company) {
      this.companyId = typeof company === "string" ? company : company.id;
      this.chatToolId = chatToolId;
      switch (this.chatToolId) {
        case ChatToolId.SLACK:
          if (installation) {
            this.appTeamId = installation.team.id;
            this.accessToken = installation.bot.token;
            this.installation = installation;
          } else if (appInstallUserId) {
            this.appInstallUserId = appInstallUserId;
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

  @Column({ name: "access_token", type: "varchar", length: 255, nullable: true })
  accessToken?: string;

  @Column({ name: "installation", type: "json", nullable: true })
  installation?: Installation;

  @OneToOne(
    () => Company,
    company => company.implementedChatTool,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;
}
