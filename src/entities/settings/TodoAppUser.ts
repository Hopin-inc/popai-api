import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "./User";
import TodoApp from "../masters/TodoApp";

@Entity("s_todo_app_users")
export default class TodoAppUser extends BaseEntity {
  constructor(
    todoApp: TodoApp | number,
    user: User | number,
    userAppId: string,
    userAppName: string, // TODO: Set this optional.
    email: string, // TODO: Set this optional.
  ) {
    super();
    if (todoApp && user) {
      this.todoapp_id = typeof todoApp === "number" ? todoApp : todoApp.id;
      this.employee_id = typeof user === "number" ? user : user.id;
      this.user_app_id = userAppId;
      if (userAppName) {
        this.user_app_name = userAppName;
      }
      if (email) {
        this.email = email;
      }
    }
  }

  @PrimaryColumn()
  employee_id: number;

  @PrimaryColumn()
  todoapp_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  user_app_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  user_app_name: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  avatar: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  email: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  api_key: string;

  @Column({ type: "text", nullable: true, collation: "utf8mb4_unicode_ci" })
  api_token: string;

  @Column({ type: "text", nullable: true, collation: "utf8mb4_unicode_ci" })
  refresh_token: string;

  @Column({ type: "int", nullable: true })
  expires_in: number;

  @ManyToOne(
    () => User,
    user => user.todoAppUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "employee_id" })
  user: User;

  @ManyToOne(
    () => TodoApp,
    todoApp => todoApp.todoAppUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todoapp_id" })
  todoApp: TodoApp;
}
