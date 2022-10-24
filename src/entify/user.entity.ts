import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { TodoAppUser } from './todoappuser.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  line_id: string;

  @OneToMany(
    () => TodoAppUser,
    (todoappuser) => todoappuser.user
  )
  todoAppUsers: TodoAppUser[];
}
