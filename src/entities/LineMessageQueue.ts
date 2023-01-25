import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne } from "typeorm";

import BaseEntity from "./BaseEntity";
import ChatMessage from "./ChatMessage";
import Todo from "./Todo";
import User from "./User";

@Entity("line_message_queues")
export default class LineMessageQueue extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  todo_id: number;

  @Column()
  user_id: number;

  @Column({ type: "tinyint", width: 1, default: 0 })
  status: number;

  @Column({ type: "date", nullable: true })
  remind_date: Date;
  
  @Column({ nullable: true })
  message_id: number;

  @ManyToOne(
    () => User,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(
    () => Todo,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;

  @OneToOne(
    () => ChatMessage,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "message_id" })
  message: ChatMessage;
}
