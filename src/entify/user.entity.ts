import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ChatTool } from './chat_tool.entity';
import { CompanyCondion } from './company.conditon.entity';
import { Todo } from './todo.entity';
import { TodoAppUser } from './todoappuser.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  company_id: number;

  @OneToMany(
    () => CompanyCondion,
    (conditon) => conditon.user
  )
  @JoinColumn({ name: 'company_id', referencedColumnName: 'company_id' })
  companyCondition: CompanyCondion[];

  @OneToMany(
    () => TodoAppUser,
    (todoappuser) => todoappuser.user
  )
  todoAppUsers: TodoAppUser[];

  @ManyToMany(
    () => ChatTool,
    (chattool) => chattool.users
  )
  @JoinTable({
    name: 'chat_tool_users',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'id' },
  })
  chattools: ChatTool[];
}
