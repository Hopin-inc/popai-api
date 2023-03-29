import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import MessageType from "../masters/MessageType";
import User from "../settings/User";
import ChatTool from "../masters/ChatTool";
import Todo from "./Todo";
import { IRemindType } from "@/types";
import { OpenStatus, RemindType, ReplyStatus, SenderType } from "../../consts/common";
import { toJapanDateTime } from "../../utils/common";
import moment from "moment/moment";

@Entity("t_messages")
export default class ChatMessage extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  parent_message_id: number;

  @Column({ nullable: true })
  message_type_id: number;

  @Column({ nullable: true })
  message_trigger_id: number;

  @Column({ nullable: true })
  is_from_user: boolean;

  @Column({ nullable: true })
  user_id: number;

  @Column({ nullable: true })
  chattool_id: number;

  @Column({ type: "text", collation: "utf8mb4_unicode_ci", nullable: true })
  message_token: string;

  @Column({ type: "datetime", nullable: true, default: null })
  send_at: Date;

  @Column({ nullable: true })
  todo_id: number;

  @Column({ nullable: true })
  is_opened: boolean;

  @Column({ nullable: true })
  is_replied: boolean;

  @Column({ type: "datetime", nullable: true, default: null })
  url_clicked_at: Date;

  @Column({ nullable: true })
  reply_content_type_id: number;

  @Column({ type: "text", collation: "utf8mb4_unicode_ci" })
  body: string;

  @Column({
    type: "tinyint",
    width: 1,
    default: 0,
    comment: "0: リマインドでない, 1: 期日に対するリマインド, 2: 担当者未設定に対するリマインド, 3: 期日未設定に対するリマインド, 4: 担当者・期日未設定に対するリマインド",
  })
  remind_type: number;

  @Column({ nullable: true })
  remind_before_days: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  channel_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  thread_id: string;

  @ManyToOne(
    () => MessageType,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "message_type_id" })
  messageType: MessageType;

  @ManyToOne(
    () => User,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(
    () => ChatTool,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "chattool_id" })
  chattool: ChatTool;

  @ManyToOne(
    () => Todo,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;

  constructor(
    chatTool: ChatTool | number,
    message: string,
    messageTriggerId: number,
    messageType: number,
    user?: User | number,
    channelId?: string,
    threadId?: string,
    remindTypes?: IRemindType,
    todo?: Todo,
    messageToken?: string,
    messageParentId?: number,
  ) {
    super();
    if (chatTool && message && messageTriggerId && messageType) {
      this.chattool_id = typeof chatTool === "number" ? chatTool : chatTool.id;
      this.body = message;
      this.message_trigger_id = messageTriggerId;
      this.message_type_id = messageType;

      // Default
      this.is_from_user = SenderType.FROM_BOT;
      this.is_opened = OpenStatus.OPENED;
      this.is_replied = ReplyStatus.NOT_REPLIED;
      this.send_at = toJapanDateTime(moment().utc().toDate());

      // Prefer
      this.user_id = typeof user === "number" ? user : user?.id;
      this.channel_id = channelId ?? this.channel_id;
      this.thread_id = threadId ?? this.thread_id;
      this.remind_type = remindTypes?.remindType ?? RemindType.NOT_REMIND;
      this.remind_before_days = remindTypes?.remindDays ?? null;
      this.todo_id = todo?.id ?? this.todo_id;
      this.message_token = messageToken ?? this.message_token;
      this.parent_message_id = messageParentId ?? this.parent_message_id;
    }
  }
}
