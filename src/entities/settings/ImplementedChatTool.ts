import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import ChatTool from "../masters/ChatTool";
import Company from "./Company";
import { Installation } from "@slack/oauth";

@Entity("s_implemented_chat_tools")
export default class ImplementedChatTool extends BaseEntity {
  constructor(company: Company | number, chatTool: ChatTool | number, auth?: Installation) {
    super();
    if (company && chatTool) {
      this.company_id = typeof company === "number" ? company : company.id;
      this.chattool_id = typeof chatTool === "number" ? chatTool : chatTool.id;
      if (auth) {
        this.auth = auth;
      }
    }
  }

  @PrimaryColumn()
  company_id: number;

  @PrimaryColumn()
  chattool_id: number;

  @Column({ type: "json", nullable: true })
  auth?: Installation;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(
    () => ChatTool,
    chattool => chattool.chattoolCompanies,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "chattool_id" })
  chattool: ChatTool;
}
