import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, Index, AfterLoad } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "../settings/Company";
import User from "../settings/User";
import Prospect from "./Prospect";
import TodoProject from "./TodoProject";
import ProjectUser from "./ProjectUser";
import Todo from "./Todo";
import { Sorter } from "../../utils/array";
import ProjectHistory from "./ProjectHistory";
import Remind from "./Remind";

type ConstructorOptions = {
  name: string;
  todoAppId: number;
  company: Company | string;
  appProjectId: string;
  appUrl?: string;
  appCreatedAt?: Date;
  appCreatedBy?: string;
  startDate?: Date;
  deadline?: Date;
  isDone: boolean;
  isClosed: boolean;
}

@Entity("t_projects")
export default class Project extends BaseEntity {
  constructor(options: ConstructorOptions) {
    super();
    if (options) {
      const { company, ...rest } = options;
      this.companyId = typeof company === "string" ? company : company.id;
      Object.assign(this, { ...this, ...rest });
    }
  }

  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "todo_app_id" })
  todoAppId: number;

  @Column({ name: "company_id" })
  companyId: string;

  @Index()
  @Column({ name: "app_project_id", type: "varchar", length: 255 })
  appProjectId: string;

  @Index()
  @Column({ name: "app_url", type: "varchar", length: 255, nullable: true })
  appUrl?: string;

  @Column({ name: "app_created_by", nullable: true })
  appCreatedBy?: string;

  @Column({ name: "app_created_at", type: "datetime", nullable: true })
  appCreatedAt?: Date;

  @Index()
  @Column({ name: "start_date", type: "date", nullable: true })
  startDate?: Date;

  @Index()
  @Column({ name: "deadline", type: "date", nullable: true })
  deadline?: Date;

  @Column({ name: "is_done", default: false })
  isDone: boolean;

  @Column({ name: "is_closed", default: false })
  isClosed: boolean;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToMany(
    () => ProjectUser,
    projectUser => projectUser.project,
    { cascade: true },
  )
  projectUsers: ProjectUser[];
  users: User[] = [];

  @OneToMany(
    () => TodoProject,
    todoProject => todoProject.project,
    { cascade: true },
  )
  todoProjects: TodoProject[];
  todos: Todo[] = [];

  @OneToMany(
    () => ProjectHistory,
    history => history.project,
    { cascade: false },
  )
  histories: ProjectHistory[];

  @OneToMany(
    () => Prospect,
    prospect => prospect.todo,
    { cascade: false },
  )
  prospects: Prospect[];
  latestProspect: Prospect | null = null;

  @OneToMany(
    () => Remind,
    remind => remind.project,
    { cascade: false },
  )
  reminds: Remind[];
  latestRemind: Remind | null = null;

  @AfterLoad()
  setUsers() {
    this.users = this.projectUsers
      ? this.projectUsers.filter(pu => !pu.deletedAt).map(pu => pu.user)
      : [];
  }

  @AfterLoad()
  setTodos() {
    this.todos = this.todoProjects
      ? this.todoProjects.filter(tp => !tp.deletedAt).map(tp => tp.todo)
      : [];
  }

  @AfterLoad()
  setLatestProspect() {
    this.latestProspect = this.prospects && this.prospects.length
      ? this.prospects.sort(Sorter.byDate<Prospect>("createdAt")).slice(-1)[0]
      : null;
  }

  @AfterLoad()
  setLatestRemind() {
    this.latestRemind = this.reminds && this.reminds.length
      ? this.reminds.sort(Sorter.byDate<Remind>("createdAt")).slice(-1)[0]
      : null;
  }
}
