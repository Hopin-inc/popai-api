import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import BaseEntity from "./base.entity";
import { Todo } from "./todo.entity";
import { User } from "./user.entity";

@Entity('todo_users')
export class TodoUser extends BaseEntity {
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
