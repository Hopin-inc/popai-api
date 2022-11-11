import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';

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

  @ManyToMany(
    () => User,
    (user) => user.chattools
  )
  @JoinTable({
    name: 'chat_tool_users',
    joinColumn: { name: 'chattool_id' },
    inverseJoinColumn: { name: 'id' },
  })
  users: User[];
}
