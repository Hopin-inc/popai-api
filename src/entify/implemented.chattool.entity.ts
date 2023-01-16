import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ChatTool } from './chat_tool.entity';
import { Company } from './company.entity';
import BaseEntity from "./base.entity";

@Entity('implemented_chat_tools')
export class ImplementedChatTool extends BaseEntity {
  @PrimaryColumn()
  company_id: number;

  @PrimaryColumn()
  chattool_id: number;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(
    () => ChatTool,
    chattool => chattool.chattoolCompanies,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'chattool_id' })
  chattool: ChatTool;
}
