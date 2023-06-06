import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import BaseEntity from "../BaseEntity";
import Project from "./Project";

type ConstructorOptions = {
  project: Project | string;
  property: number;
  action: number;
  startDate?: Date;
  deadline?: Date;
  userIds?: string[];
  daysDiff?: number;
  appUpdatedAt?: Date;
};

@Entity("t_project_histories")
export default class ProjectHistory extends BaseEntity {
  constructor(options: ConstructorOptions) {
    super();
    if (options) {
      const { project, ...rest } = options;
      this.projectId = typeof project === "string" ? project : project.id;
      Object.assign(this, { ...this, ...rest });
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Column({ name: "project_id", nullable: true })
  projectId: string;

  @Index()
  @Column({ name: "property" })
  property: number;

  @Index()
  @Column({ name: "action" })
  action: number;

  @Column({ name: "start_date", nullable: true })
  startDate?: Date;

  @Column({ name: "deadline", nullable: true })
  deadline?: Date;

  @Column({ name: "user_ids", type: "json", nullable: true })
  userIds?: string[];

  @Column({ name: "days_diff", nullable: true })
  daysDiff?: number;

  @Column({ name: "app_updated_at", nullable: true })
  appUpdatedAt?: Date;

  @ManyToOne(
    () => Project,
    project => project.histories,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "project_id" })
  project: Project;
}
