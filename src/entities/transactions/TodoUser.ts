import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Todo from "./Todo";
import User from "../settings/User";

@Entity("t_todo_users")
export default class TodoUser extends BaseEntity {
  constructor(todo: Todo | string, user: User | string) {
    super();
    if (todo && user) {
      this.todoId = typeof todo === "string" ? todo : todo.id;
      this.userId = typeof user === "string" ? user : user.id;
    }
  }

  @PrimaryColumn({ name: "todo_id" })
  todoId: string;

  @PrimaryColumn({ name: "user_id" })
  userId: string;

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
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
