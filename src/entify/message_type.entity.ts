import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('m_message_types')
export class MessageType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
