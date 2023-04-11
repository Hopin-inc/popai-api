import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import ChatTool from "../masters/ChatTool";
import Company from "./Company";
import { Installation } from "@slack/oauth";
import { ChatToolId } from "../../consts/common";

@Entity("s_implemented_chat_tools")
export default class ImplementedChatTool extends BaseEntity {
  constructor(
    company: Company | number,
    chatTool: ChatTool | number,
    installation?: Installation,
  ) {
    super();
    if (company && chatTool) {
      this.company_id = typeof company === "number" ? company : company.id;
      this.chattool_id = typeof chatTool === "number" ? chatTool : chatTool.id;
      if (this.chattool_id === ChatToolId.SLACK && installation) {
        this.app_team_id = installation.team.id;
        this.access_token = installation.bot.token;
        this.installation = installation;
      }
    }
  }

  @PrimaryColumn()
  company_id: number;

  @PrimaryColumn()
  chattool_id: number;

  @Column({ type: "varchar", length: 12, collation: "utf8mb4_unicode_ci", nullable: true })
  app_team_id?: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  access_token?: string;

  @Column({ type: "json", nullable: true })
  installation?: Installation;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(
    () => ChatTool,
    chatTool => chatTool.chattoolCompanies,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "chattool_id" })
  chattool: ChatTool;
}
