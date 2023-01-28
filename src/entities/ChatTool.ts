import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";

import BaseEntity from "./BaseEntity";
import ImplementedChatTool from "./ImplementedChatTool";
import ChatToolUser from "./ChatToolUser";
import User from "./User";
import Company from "./Company";

@Entity("m_chat_tools")
export default class ChatTool extends BaseEntity {
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
    const chattoolCompanies = this.chattoolCompanies;
    return chattoolCompanies ? chattoolCompanies.map(record => record.company) : [];
  }

  @OneToMany(
    () => ChatToolUser,
    chattoolUser => chattoolUser.chattool,
    { cascade: true }
  )
  chattoolUsers: ChatToolUser[];

  get users(): User[] {
    const chattoolUsers = this.chattoolUsers;
    return chattoolUsers ? chattoolUsers.map(record => record.user) : [];
  }
}
