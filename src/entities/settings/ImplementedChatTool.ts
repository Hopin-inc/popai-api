import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import { Installation } from "@slack/oauth";
import { ChatToolId } from "../../consts/common";
import { ValueOf } from "../../types";

@Entity("s_implemented_chat_tools")
export default class ImplementedChatTool extends BaseEntity {
  constructor(
    company: Company | string,
    chatToolId: ValueOf<typeof ChatToolId>,
    installation?: Installation,
  ) {
    super();
    if (company) {
      this.companyId = typeof company === "string" ? company : company.id;
      this.chatToolId = chatToolId;
      if (this.chatToolId === ChatToolId.SLACK && installation) {
        this.appTeamId = installation.team.id;
        this.accessToken = installation.bot.token;
        this.installation = installation;
      }
    }
  }

  @PrimaryColumn({ name: "company_id" })
  companyId: string;

  @PrimaryColumn({ name: "chat_tool_id" })
  chatToolId: number;

  @Column({ name: "app_team_id", type: "varchar", length: 12, nullable: true })
  appTeamId?: string;

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
