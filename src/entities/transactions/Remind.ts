import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Todo from "./Todo";
import Project from "./Project";
import User from "../settings/User";
import Company from "../settings/Company";
import { Exclusive } from "../../types";

type ConstructorOptions = {
  user: User | string;
  company: Company | string;
  chatToolId?: number;
  appChannelId?: string;
  appThreadId?: string;
} & Exclusive<{
  todo: Todo | string;
}, {
  project: Project | string;
}>;

@Entity("t_reminds")
export default class Remind extends BaseEntity {
  constructor(options: ConstructorOptions) {
    super();
    if (options) {
      const { user, company, todo, project, ...rest } = options;
      this.userId = typeof user === "string" ? user : user.id;
      this.companyId = typeof company === "string" ? company : company.id;
      if (todo) {
        this.todoId = typeof todo === "string" ? todo : todo.id;
      }
      if (project) {
        this.projectId = typeof project === "string" ? project : project.id;
      }
      Object.assign(this, { ...this, ...rest });
    }
  }

  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "todo_id", nullable: true })
  todoId?: string;

  @Column({ name: "project_id", nullable: true })
  projectId?: string;

  @Column({ name: "chat_tool_id", nullable: true })
  chatToolId?: number;

  @Index()
  @Column({ name: "app_channel_id", type: "varchar", length: 255, nullable: true })
  appChannelId?: string;

  @Index()
  @Column({ name: "app_thread_id", type: "varchar", length: 255, nullable: true })
  appThreadId?: string;

  @ManyToOne(
    () => User,
    user => user.reminds,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(
    () => Todo,
    todo => todo.prospects,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todo_id" })
  todo?: Todo;

  @ManyToOne(
    () => Project,
    project => project.prospects,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "project_id" })
  project?: Project;
}
