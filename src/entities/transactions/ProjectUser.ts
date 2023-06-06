import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "../settings/User";
import Project from "./Project";

@Entity("t_project_users")
export default class ProjectUser extends BaseEntity {
  constructor(project: Project | string, user: User | string) {
    super();
    if (project && user) {
      this.projectId = typeof project === "string" ? project : project.id;
      this.userId = typeof user === "string" ? user : user.id;
    }
  }

  @PrimaryColumn({ name: "project_id" })
  projectId: string;

  @PrimaryColumn({ name: "user_id" })
  userId: string;

  @ManyToOne(
    () => Project,
    project => project.projectUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "project_id" })
  project: Project;

  @ManyToOne(
    () => User,
    user => user.todoUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
