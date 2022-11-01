import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, OneToMany } from 'typeorm';
import { Company } from './company.entity';
import { Todo } from './todo.entity';
import { TodoAppUser } from './todoappuser.entity';

@Entity('m_todo_apps')
export class TodoApp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  todo_app_code: string;

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

  @OneToMany(
    () => Todo,
    (todo) => todo.todoapp
  )
  todos: Todo[];
}
