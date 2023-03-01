import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import ChatTool from "../masters/ChatTool";
import Company from "./Company";

@Entity("implemented_chat_tools")
export default class ImplementedChatTool extends BaseEntity {
  @PrimaryColumn()
  company_id: number;

  @PrimaryColumn()
  chattool_id: number;

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
