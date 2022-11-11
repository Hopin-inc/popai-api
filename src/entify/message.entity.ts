import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  parent_message_id: number;

  @Column()
  message_type_id: number;

  @Column()
  message_trigger_id: number;

  @Column()
  is_from_user: number;

  @Column()
  user_id: number;

  @Column()
  chattool_id: number;

  @Column()
  message_token: string;

  @Column()
  send_at: Date;

  @Column()
  todo_id: number;

  @Column()
  is_openned: number;

  @Column()
  is_replied: number;

  @Column()
  reply_content_type_id: number;

  @Column()
  body: string;

  @Column()
  remind_type: number;

  @Column()
  remind_before_days: number;
}
