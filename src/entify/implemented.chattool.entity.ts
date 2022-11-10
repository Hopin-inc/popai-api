import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { ChatTool } from './chat_tool.entity';
import { Company } from './company.entity';

@Entity('implemented_chat_tools')
export class ImplementedChatTool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  chattool_id: number;

  @OneToOne(
    () => Company,
    (company) => company.id
  )
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToOne(
    () => ChatTool,
    (chattool) => chattool.id
  )
  @JoinColumn({ name: 'chattool_id' })
  chattool: ChatTool;
}
