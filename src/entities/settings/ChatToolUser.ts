import { Entity, Column, PrimaryColumn, JoinColumn, OneToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "./User";
import { ValueOf } from "../../types";
import { ChatToolId } from "../../consts/common";

@Entity("s_chat_tool_users")
export default class ChatToolUser extends BaseEntity {
  constructor(user: User | string, chatToolId: ValueOf<typeof ChatToolId>, appUserId: string) {
    super();
    if (user) {
      this.userId = typeof user === "string" ? user : user.id;
      this.chatToolId = chatToolId;
      this.appUserId = appUserId;
    }
  }

  @PrimaryColumn({ name: "user_id" })
  userId: string;

  @PrimaryColumn({ name: "chat_tool_id" })
  chatToolId: number;

  @Column({ name: "app_user_id", type: "varchar", length: 255 })
  appUserId: string;

  @OneToOne(
    () => User,
    user => user.chatToolUser,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
