import { Entity, Unique, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TodoApp } from './todoapp.entity';
import { User } from './user.entity';

@Entity('todos')
@Unique(['todoapp_id', 'todoapp_reg_id', 'assigned_user_id'])
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  todoapp_id: number;

  @Column()
  company_id: number;

  @Column()
  assigned_user_id: number;

  @Column()
  todoapp_reg_id: string;

  @Column()
  todoapp_reg_url: string;

  @Column()
  todoapp_reg_created_by: number;

  @Column()
  todoapp_reg_created_at: Date;

  @Column()
  deadline: Date;

  @Column()
  is_done: boolean;

  @Column()
  is_reminded: boolean;

  @Column()
  is_rescheduled: boolean;

  @Column()
  reminded_count: number;

  @ManyToOne(
    () => User,
    (user) => user.todos
  )
  @JoinColumn({ name: 'assigned_user_id' })
  user: User;

  @ManyToOne(
    () => TodoApp,
    (todoapp) => todoapp.todos
  )
  @JoinColumn({ name: 'todoapp_id' })
  todoapp: TodoApp;
}
