import {
  Entity,
  Unique,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Todo } from './todo.entity';
import { User } from './user.entity';

@Entity('todo_users')
@Unique(['todo_id', 'user_id'])
export class TodoUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  todo_id: number;

  @Column()
  user_id: number;

  @Column()
  created_at: Date;

  @Column()
  deleted_at: Date;

  @ManyToOne(
    () => Todo,
    (todo) => todo.todoUsers
  )
  @JoinColumn({ name: 'todo_id' })
  todo: Todo;

  @OneToOne(
    () => User,
    (user) => user.id
  )
  @JoinColumn({ name: 'user_id' })
  user: User;
}
