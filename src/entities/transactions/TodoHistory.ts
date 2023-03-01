import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Column } from "typeorm";
import BaseEntity from "../BaseEntity";
import Todo from "./Todo";
import User from "../settings/User";

@Entity("todo_histories")
export default class TodoHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  todo_id: number;

  @Column()
  property: number;

  @Column()
  action: number;

  @Column({ nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  user_id: number;

  @Column({ nullable: true })
  days_diff: number;

  @Column({ nullable: true })
  edited_by: number;

  @Column()
  todoapp_reg_updated_at: Date;

  @ManyToOne(
    () => Todo,
    todo => todo.todoUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;

  @ManyToOne(
    () => User,
    user => user.todoUsers,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
