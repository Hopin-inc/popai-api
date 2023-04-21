import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, Index } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "../settings/Company";
import TodoUser from "./TodoUser";
import User from "../settings/User";
import TodoHistory from "./TodoHistory";
import Prospect from "./Prospect";
import { toJapanDateTime } from "../../utils/datetime";
import { Sorter } from "../../utils/array";
import { ITask, ValueOf } from "../../types";
import { INotionTask } from "../../types/notion";
import { TodoAppId } from "../../consts/common";

@Entity("t_todos")
export default class Todo extends BaseEntity {
  constructor(
    todoByApi: ITask,
    company: Company | string,
    todoAppId: ValueOf<typeof TodoAppId>,
    todoByDb?: Todo,
  ) {
    super();
    if (todoByApi && company) {
      this.companyId = typeof company === "string" ? company : company.id;
      this.todoAppId = todoAppId;
      this.id = todoByDb?.id ?? null;
      switch (todoAppId) {
        case TodoAppId.NOTION:
          const notionTodo = todoByApi as INotionTask;
          this.name = notionTodo.name;
          this.appTodoId = notionTodo.todoAppRegId;
          this.appUrl = notionTodo.todoAppRegUrl;
          this.createdBy = notionTodo.createdById;
          this.appCreatedAt = toJapanDateTime(notionTodo.createdAt);
          this.startDate = notionTodo.startDate ? toJapanDateTime(notionTodo.startDate) : null;
          this.deadline = notionTodo.deadline ? toJapanDateTime(notionTodo.deadline) : null;
          this.isDone = notionTodo.isDone;
          this.isClosed = notionTodo.isClosed;
          break;
      }
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

  @Index()
  @Column({ name: "app_url", type: "varchar", length: 255, nullable: true })
  appUrl?: string;

  @Column({ name: "created_by", nullable: true })
  createdBy?: string;

  @Column({ name: "app_created_at", type: "datetime", nullable: true })
  appCreatedAt?: Date;

  @Index()
  @Column({ name: "start_date", type: "datetime", nullable: true })
  startDate: Date;

  @Index()
  @Column({ name: "deadline", type: "datetime", nullable: true, default: null })
  deadline: Date;

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

  get users(): User[] {
    const todoUsers = this.todoUsers;
    return todoUsers ? todoUsers.filter(tu => !tu.deletedAt).map(tu => tu.user) : [];
  }

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

  get latestProspect(): Prospect | null {
    if (this.prospects && this.prospects.length) {
      return this.prospects.sort(Sorter.byDate<Prospect>("createdAt")).slice(-1)[0];
    } else {
      return null;
    }
  }
}
