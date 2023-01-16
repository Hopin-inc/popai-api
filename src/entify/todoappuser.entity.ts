import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import BaseEntity from "./base.entity";
import { User } from "./user.entity";
import { TodoApp } from "./todoapp.entity";

@Entity('todo_app_users')
export class TodoAppUser extends BaseEntity {
  @PrimaryColumn()
  employee_id: number;

  @PrimaryColumn()
  todoapp_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  user_app_id: string;

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
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "employee_id" })
  user: User;

  @ManyToOne(
    () => TodoApp,
    todoApp => todoApp.todoAppUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "todoapp_id" })
  todoApp: TodoApp;
}
