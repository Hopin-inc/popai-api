import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Todo } from './todo.entity';
import { TodoAppUser } from './todoappuser.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

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
