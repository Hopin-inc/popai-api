import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("chat_tool_users")
export class ChatToolUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  auth_key: string;

  @Column()
  user_id: number;

  @Column()
  chattool_id: number;

  @OneToOne(
    () => User,
    (user) => user.id
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
