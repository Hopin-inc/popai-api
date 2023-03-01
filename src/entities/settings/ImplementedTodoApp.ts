import { Entity, Column, JoinColumn, PrimaryColumn, ManyToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import TodoApp from "../masters/TodoApp";

@Entity("implemented_todo_apps")
export default class ImplementedTodoApp extends BaseEntity {
  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  auth_key: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  primary_domain: string;

  @PrimaryColumn()
  company_id: number;

  @PrimaryColumn()
  todoapp_id: number;

  @ManyToOne(
    () => Company,
    company => company.implementedTodoApps,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(
    () => TodoApp,
    todoApp => todoApp.implementedCompanies,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "todoapp_id" })
  todoApp: TodoApp;
}
