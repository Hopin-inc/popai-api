import { Entity, Column, PrimaryGeneratedColumn, OneToMany, JoinColumn } from 'typeorm';
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

  @Column()
  line_id: string;

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

  @OneToMany(
    () => Todo,
    (todo) => todo.user
  )
  todos: Todo[];
}
