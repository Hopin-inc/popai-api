import { Entity, Column, JoinColumn, PrimaryColumn, ManyToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import TodoApp from "../masters/TodoApp";
import { INotionOAuthToken } from "@/types/notion";
import { TodoAppId } from "../../consts/common";

@Entity("s_implemented_todo_apps")
export default class ImplementedTodoApp extends BaseEntity {
  constructor(
    company: Company | number,
    todoApp: TodoApp | number,
    installation: INotionOAuthToken,
  ) {
    super();
    if (company && todoApp) {
      this.company_id = typeof company === "number" ? company : company.id;
      this.todoapp_id = typeof todoApp === "number" ? todoApp : todoApp.id;
      if (this.todoapp_id === TodoAppId.NOTION && installation) {
        this.access_token = installation.access_token;
        this.app_workspace_id = installation.workspace_id;
        this.installation = installation;
      }
    }
  }

  @PrimaryColumn()
  company_id: number;

  @PrimaryColumn()
  todoapp_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  primary_domain?: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  access_token?: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  app_workspace_id?: string;

  @Column({ type: "json", nullable: true })
  installation?: INotionOAuthToken;

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
