import {
  Entity,
  Unique,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { TodoApp } from "./todoapp.entity";
import { TodoUser } from "./todo.user.entity";

@Entity("todos")
@Unique(["todoapp_id", "todoapp_reg_id"])
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
  section_id: number;

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
  delayed_count: number;

  @Column({ default: false })
  is_closed: boolean;

  @Column()
  reminded_count: number;

  @Column()
  first_ddl_set_at: Date;

  @Column()
  first_assigned_at: Date;

  @ManyToOne(
    () => TodoApp,
    (todoapp) => todoapp.todos
  )
  @JoinColumn({ name: "todoapp_id" })
  todoapp: TodoApp;

  @OneToMany(
    () => TodoUser,
    (todoUser) => todoUser.todo
  )
  todoUsers: TodoUser[];
}
