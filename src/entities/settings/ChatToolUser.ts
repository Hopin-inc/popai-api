import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "./User";
import ChatTool from "../masters/ChatTool";

@Entity("s_chat_tool_users")
export default class ChatToolUser extends BaseEntity {
  constructor(chatTool: ChatTool | number, user: User | number, userAppId: string) {
    super();
    if (chatTool && user) {
      this.chattool_id = typeof chatTool === "number" ? chatTool : chatTool.id;
      this.user_id = typeof user === "number" ? user : user.id;
      this.auth_key = userAppId;
    }
  }

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  auth_key: string;

  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  chattool_id: number;

  @ManyToOne(
    () => User,
    user => user.chattoolUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(
    () => ChatTool,
    chattool => chattool.chattoolUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "chattool_id" })
  chattool: ChatTool;
}
