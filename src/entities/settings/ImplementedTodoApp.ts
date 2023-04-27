import { Entity, Column, JoinColumn, PrimaryColumn, OneToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import { INotionOAuthToken } from "../../types/notion";
import { TodoAppId } from "../../consts/common";
import { ValueOf } from "../../types";

@Entity("s_implemented_todo_apps")
export default class ImplementedTodoApp extends BaseEntity {
  constructor(
    company: Company | string,
    todoAppId: ValueOf<typeof TodoAppId>,
    installation: INotionOAuthToken,
  ) {
    super();
    if (company) {
      this.companyId = typeof company === "string" ? company : company.id;
      this.todoAppId = todoAppId;
      if (this.todoAppId === TodoAppId.NOTION && installation) {
        this.accessToken = installation.access_token;
        this.appWorkspaceId = installation.workspace_id;
        this.installation = installation;
      }
    }
  }

  @PrimaryColumn({ name: "company_id" })
  companyId: string;

  @PrimaryColumn({ name: "todo_app_id" })
  todoAppId: number;

  @Column({ name: "access_token", type: "varchar", length: 255, nullable: true })
  accessToken?: string;

  @Column({ name: "app_workspace_id", type: "varchar", length: 255, nullable: true })
  appWorkspaceId?: string;

  @Column({ name: "installation", type: "json", nullable: true })
  installation?: INotionOAuthToken;

  @OneToOne(
    () => Company,
    company => company.implementedTodoApp,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;
}
