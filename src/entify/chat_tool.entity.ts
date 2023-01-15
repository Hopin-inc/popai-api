import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import BaseEntity from "./base.entity";
import { ImplementedChatTool } from "./implemented.chattool.entity";
import { ChatToolUser } from "./chattool.user.entity";
import { User } from "./user.entity";
import { Company } from "./company.entity";

@Entity('m_chat_tools')
export class ChatTool extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ type: "varchar", length: 25, collation: "utf8mb4_unicode_ci", nullable: true })
  tool_code: string;

  @OneToMany(
    () => ImplementedChatTool,
    implementedChatTool => implementedChatTool.chattool,
    { cascade: true }
  )
  chattoolCompanies: ImplementedChatTool[];

  get companies(): Company[] {
    return this.chattoolCompanies.map(record => record.company);
  }

  @OneToMany(
    () => ChatToolUser,
    chattoolUser => chattoolUser.chattool,
    { cascade: true }
  )
  chattoolUsers: ChatToolUser[];

  get users(): User[] {
    return this.chattoolUsers.map(record => record.user);
  }
}
