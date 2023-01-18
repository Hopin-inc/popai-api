import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import BaseEntity from "./base.entity";
import { User } from "./user.entity";
import { ChatTool } from "./chat_tool.entity";

@Entity('chat_tool_users')
export class ChatToolUser extends BaseEntity {
  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  auth_key: string;

  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  chattool_id: number;

  @ManyToOne(
    () => User,
    user => user.chattoolUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(
    () => ChatTool,
    chattool => chattool.chattoolUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "chattool_id" })
  chattool: ChatTool;
}
