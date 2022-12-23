import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { ChatMessage } from "./message.entity";
import { Todo } from "./todo.entity";
import { User } from "./user.entity";

@Entity("line_message_queues")
@Unique(["todo_id", "user_id", "status", "remind_date"])
export class LineMessageQueue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  todo_id: number;

  @Column()
  user_id: number;

  @Column()
  status: number;

  @Column()
  remind_date: Date;

  @Column()
  message_id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @OneToOne(() => Todo)
  @JoinColumn({ name: "todo_id" })
  todo: Todo;

  @OneToOne(() => ChatMessage)
  @JoinColumn({ name: "message_id" })
  message: ChatMessage;
}
