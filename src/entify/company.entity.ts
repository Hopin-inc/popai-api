import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { TodoApp } from './todoapp.entity';
import { User } from './user.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  admin_user_id: number;

  @ManyToMany(
    () => TodoApp,
    (todoapp) => todoapp.companies
  )
  @JoinTable({
    name: 'implemented_todo_apps',
    joinColumn: {
      name: 'company_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'todoapp_id',
      referencedColumnName: 'id',
    },
  })
  todoapps: TodoApp[];

  @OneToOne(
    () => User,
    (user) => user.id
  )
  @JoinColumn({ name: 'admin_user_id' })
  admin_user: User;
}
