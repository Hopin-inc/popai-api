import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { MessageType } from "./message_type.entity";
import { User } from "./user.entity";
import { ChatTool } from "./chat_tool.entity";
import { Todo } from "./todo.entity";

@Entity('messages')
export class ChatMessage {
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

  @Column({ type: "text", collation: "utf8mb4_unicode_ci" })
  message_token: string;

  @Column({ type: "datetime", nullable: true, default: null })
  send_at: Date;

  @Column({ nullable: true })
  todo_id: number;

  @Column({ nullable: true })
  is_openned: boolean;

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
    comment: '0: リマインドでない, 1: 期日に対するリマインド, 2: 担当者未設定に対するリマインド, 3: 期日未設定に対するリマインド, 4: 担当者・期日未設定に対するリマインド'
  })
  remind_type: number;

  @Column({ nullable: true })
  remind_before_days: number;

  @ManyToOne(
    () => MessageType,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'message_type_id' })
  messageType: MessageType;

  @ManyToOne(
    () => User,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(
    () => ChatTool,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'chattool_id' })
  chattool: ChatTool;

  @ManyToOne(
    () => Todo,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'todo_id' })
  todo: Todo;
}
