import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, OneToMany } from 'typeorm';
import { Company } from './company.entity';
import { TodoAppUser } from './todoappuser.entity';

@Entity('m_todo_apps')
export class TodoApp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(
    () => Company,
    (company) => company.todoapps
  )
  companies: Company[];

  @OneToMany(
    () => TodoAppUser,
    (todoappuser) => todoappuser.todoapp
  )
  todoappuser: TodoAppUser[];
}
