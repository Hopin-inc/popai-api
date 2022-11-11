import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('chat_tool_users')
export class ChatToolUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  auth_key: string;

  @Column()
  user_id: number;

  @Column()
  chattool_id: number;
}
