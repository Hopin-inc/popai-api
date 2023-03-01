import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Todo from "./Todo";
import User from "../settings/User";

@Entity("todo_users")
export default class TodoUser extends BaseEntity {
  @PrimaryColumn()
  todo_id: number;

  @PrimaryColumn()
  user_id: number;

  @ManyToOne(
    () => Todo,
    todo => todo.todoUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;

  @ManyToOne(
    () => User,
    user => user.todoUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
