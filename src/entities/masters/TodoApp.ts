import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";

import BaseEntity from "../BaseEntity";
import Todo from "../transactions/Todo";
import ImplementedTodoApp from "../settings/ImplementedTodoApp";
import TodoAppUser from "../settings/TodoAppUser";
import User from "../settings/User";
import Company from "../settings/Company";

@Entity("m_todo_apps")
export default class TodoApp extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ type: "varchar", length: 40, collation: "utf8mb4_unicode_ci", nullable: true }) // TODO: unnecessary
  todo_app_code: string;

  @OneToMany(
    () => ImplementedTodoApp,
    implementedTodoApp => implementedTodoApp.todoApp,
    { cascade: true },
  )
  implementedCompanies: ImplementedTodoApp[];

  get companies(): Company[] {
    const implementedCompanies = this.implementedCompanies;
    return implementedCompanies ? implementedCompanies.map(record => record.company) : [];
  }

  @OneToMany(
    () => TodoAppUser,
    todoAppUser => todoAppUser.todoApp,
    { cascade: true },
  )
  todoAppUsers: TodoAppUser[];

  get users(): User[] {
    const todoAppUsers = this.todoAppUsers;
    return todoAppUsers ? todoAppUsers.map(record => record.user) : [];
  }

  @OneToMany(
    () => Todo,
    todo => todo.todoapp,
    { cascade: false },
  )
  todos: Todo[];
}
