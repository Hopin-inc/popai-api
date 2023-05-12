import { Entity, Column, JoinColumn, PrimaryColumn, OneToOne } from "typeorm";
import { OAuth2 as OAuth2Entity } from "backlog-js/dist/types/entity";

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
    installation: INotionOAuthToken | OAuth2Entity.AccessToken,
    appWorkspaceId?: string,
  ) {
    super();
    if (company) {
      this.companyId = typeof company === "string" ? company : company.id;
      this.todoAppId = todoAppId;
      switch (this.todoAppId) {
        case TodoAppId.NOTION:
          if (installation) {
            installation = installation as INotionOAuthToken;
            this.accessToken = installation.access_token;
            this.appWorkspaceId = installation.workspace_id;
            this.installation = installation;
          }
          break;
        case TodoAppId.BACKLOG:
          if (installation && appWorkspaceId) {
            installation = installation as OAuth2Entity.AccessToken;
            this.accessToken = installation.access_token;
            this.refreshToken = installation.refresh_token;
            this.appWorkspaceId = appWorkspaceId;
          }
          break;
        default:
          break;
      }
    }
  }

  @PrimaryColumn({ name: "company_id" })
  companyId: string;

  @Column({ name: "todo_app_id" })
  todoAppId: number;

  @Column({ name: "access_token", type: "varchar", length: 255, nullable: true })
  accessToken?: string;

  @Column({ name: "refresh_token", type: "varchar", length: 255, nullable: true })
  refreshToken?: string;

  @Column({ name: "app_workspace_id", type: "varchar", length: 255, nullable: true })
  appWorkspaceId?: string;

  @Column({ name: "installation", type: "json", nullable: true })
  installation?: INotionOAuthToken | OAuth2Entity.AccessToken;

  @OneToOne(
    () => Company,
    company => company.implementedTodoApp,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;
}
