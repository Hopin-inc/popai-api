import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { Company } from './company.entity';

@Entity('m_chat_tools')
export class ChatTool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  tool_code: string;

  @ManyToMany(
    () => Company,
    (company) => company.chattools
  )
  companies: Company[];
}
