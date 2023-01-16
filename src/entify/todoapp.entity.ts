import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { Todo } from './todo.entity';
import BaseEntity from "./base.entity";
import { ImplementedTodoApp } from "./implemented.todoapp.entity";
import { TodoAppUser } from "./todoappuser.entity";
import { User } from "./user.entity";
import { Company } from "./company.entity";

@Entity('m_todo_apps')
export class TodoApp extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ type: "varchar", length: 40, collation: "utf8mb4_unicode_ci", nullable: true }) // TODO: unnecessary
  todo_app_code: string;

  @OneToMany(
    () => ImplementedTodoApp,
    implementedTodoApp => implementedTodoApp.todoApp,
    { cascade: true }
  )
  implementedCompanies: ImplementedTodoApp[];

  get companies(): Company[] {
    const implementedCompanies = this.implementedCompanies;
    return implementedCompanies ? implementedCompanies.map(record => record.company) : [];
  }

  @OneToMany(
    () => TodoAppUser,
    todoAppUser => todoAppUser.todoApp,
    { cascade: true }
  )
  todoAppUsers: TodoAppUser[];

  get users(): User[] {
    const todoAppUsers = this.todoAppUsers;
    return todoAppUsers ? todoAppUsers.map(record => record.user) : [];
  }

  @OneToMany(
    () => Todo,
    todo => todo.todoapp,
    { cascade: false }
  )
  todos: Todo[];
}
