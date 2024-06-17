import {
  AfterLoad,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "../settings/Company";
import TodoUser from "./TodoUser";
import User from "../settings/User";
import TodoHistory from "./TodoHistory";
import Prospect from "./Prospect";
import TodoProject from "./TodoProject";
import Project from "./Project";
import { Sorter } from "../../utils/array";
import Remind from "./Remind";

type ConstructorOptions = {
  name: string;
  todoAppId: number;
  company: Company | string;
  appTodoId: string;
  appUrl?: string;
  appCreatedAt?: Date;
  appCreatedBy?: string;
  startDate?: Date;
  deadline?: Date;
  isDone: boolean;
  isClosed: boolean;
  appParentIds?: string[];
}

@Entity("t_todos")
export default class Todo extends BaseEntity {
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
  @Column({ name: "app_todo_id", type: "varchar", length: 255 })
  appTodoId: string;

  @Column({ name: "app_parent_todo_id", type: "json", nullable: true })
  appParentIds?: string[];

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
    () => TodoUser,
    todoUser => todoUser.todo,
    { cascade: true },
  )
  todoUsers: TodoUser[];
  users: User[] = [];

  @OneToMany(
    () => TodoProject,
    todoProject => todoProject.todo,
    { cascade: true },
  )
  todoProjects: TodoProject[];
  projects: Project[] = [];

  @OneToMany(
    () => TodoHistory,
    history => history.todo,
    { cascade: false },
  )
  histories: TodoHistory[];

  @OneToMany(
    () => Prospect,
    prospect => prospect.todo,
    { cascade: false },
  )
  prospects: Prospect[];
  latestProspect: Prospect | null = null;

  @OneToMany(
    () => Remind,
    remind => remind.todo,
    { cascade: false },
  )
  reminds: Remind[];
  latestRemind: Remind | null = null;

  @AfterLoad()
  setUsers() {
    this.users = this.todoUsers
      ? this.todoUsers.filter(tu => tu.user && !tu.deletedAt).map(tu => tu.user)
      : [];
  }

  @AfterLoad()
  setProjects() {
    this.projects = this.todoProjects
      ? this.todoProjects.filter(tp => !tp.deletedAt).map(tp => tp.project)
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
