import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TodoApp } from './todoapp.entity';
import { User } from './user.entity';

@Entity('todo_app_users')
export class TodoAppUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  api_key: string;

  @Column()
  api_token: string;

  @Column()
  refresh_token: string;

  @Column()
  expires_in: number;

  @ManyToOne(
    () => User,
    (user) => user.todoAppUsers
  )
  @JoinColumn({ name: 'employee_id' })
  user: User;

  @ManyToOne(
    () => TodoApp,
    (todoapp) => todoapp.todoappuser
  )
  @JoinColumn({ name: 'todoapp_id' })
  todoapp: TodoApp;
}
