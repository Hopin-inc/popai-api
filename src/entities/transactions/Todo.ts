import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";

import BaseEntity from "../BaseEntity";
import TodoApp from "../masters/TodoApp";
import Company from "../settings/Company";
import TodoUser from "./TodoUser";
import TodoSection from "./TodoSection";
import User from "../settings/User";
import Section from "../settings/Section";
import TodoHistory from "./TodoHistory";
import Prospect from "./Prospect";
import { replaceString, Sorter, toJapanDateTime } from "../../utils/common";
import { ITask } from "@/types";
import { INotionTask } from "@/types/notion";
import { IMicrosoftTask } from "@/types/microsoft";
import { ITrelloTask } from "@/types/trello";
import { TodoAppId } from "../../consts/common";
import { COMPLETED, MICROSOFT_BASE_URL } from "../../consts/microsoft";

@Entity("t_todos")
export default class Todo extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ nullable: true })
  todoapp_id: number;

  @Column({ nullable: true })
  company_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  todoapp_reg_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  todoapp_reg_url: string;

  @Column({ nullable: true })
  todoapp_reg_created_by: number;

  @Column({ type: "datetime" })
  todoapp_reg_created_at: Date;

  @Column({ type: "datetime", nullable: true, default: null })
  start_date: Date;

  @Column({ type: "datetime", nullable: true, default: null })
  deadline: Date;

  @Column({ nullable: true })
  is_done: boolean;

  @Column({ nullable: true })
  is_reminded: boolean;

  @Column({ default: 0 })
  delayed_count: number;

  @Column({ default: false })
  is_closed: boolean;

  @Column({ default: 0 })
  reminded_count: number;

  @Column({ type: "datetime", nullable: true, default: null })
  first_ddl_set_at: Date;

  @Column({ type: "datetime", nullable: true, default: null })
  first_assigned_at: Date;

  @ManyToOne(
    () => TodoApp,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todoapp_id" })
  todoapp: TodoApp;

  @ManyToOne(
    () => Company,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
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
    return todoUsers ? todoUsers.filter(tu => !tu.deleted_at).map(tu => tu.user) : [];
  }

  @OneToMany(
    () => TodoSection,
    todoSection => todoSection.todo,
    { cascade: false },
  )
  todoSections: TodoSection[];

  get sections(): Section[] {
    const todoSections = this.todoSections;
    return todoSections ? todoSections.filter(ts => !ts.deleted_at).map(ts => ts.section) : [];
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
      return this.prospects.sort(Sorter.byDate<Prospect>("created_at")).slice(-1)[0];
    } else {
      return null;
    }
  }

  constructor(
    todoByApi: ITask,
    company: Company | number,
    todoApp: TodoApp,
    todoByDb?: Todo,
    trelloCreatedBy?: number,
    microSoftPrimaryDomain?: string,
  ) {
    super();
    if (todoByApi && company && todoApp) {
      this.company_id = typeof company === "number" ? company : company.id;
      this.todoapp_id = todoApp.id;

      this.id = todoByDb?.id ?? null;
      this.is_reminded = todoByDb?.is_reminded ?? false;
      this.delayed_count = todoByDb?.delayed_count ?? 0;
      this.reminded_count = todoByDb?.reminded_count ?? 0;

      switch (todoApp.id) {
        case TodoAppId.NOTION:
          const notionTodo = todoByApi as INotionTask;
          this.name = notionTodo.name;
          this.todoapp_reg_id = notionTodo.todoappRegId;
          this.todoapp_reg_url = notionTodo.todoappRegUrl;
          this.todoapp_reg_created_by = notionTodo.createdById;
          this.todoapp_reg_created_at = toJapanDateTime(notionTodo.createdAt);
          this.start_date = notionTodo.startDate ? toJapanDateTime(notionTodo.startDate) : null;
          this.deadline = notionTodo.deadline ? toJapanDateTime(notionTodo.deadline) : null;
          this.is_done = notionTodo.isDone;
          this.is_closed = notionTodo.isClosed;
          break;
        case TodoAppId.TRELLO:
          const trelloTodo = todoByApi as ITrelloTask;
          this.name = trelloTodo.name;
          this.todoapp_reg_id = trelloTodo.id;
          this.todoapp_reg_url = trelloTodo.shortUrl;
          this.todoapp_reg_created_by = trelloCreatedBy;
          this.todoapp_reg_created_at = toJapanDateTime(trelloTodo.createdAt) || toJapanDateTime(trelloTodo.dateLastActivity);
          this.start_date = trelloTodo.due ? toJapanDateTime(trelloTodo.due) : null;  // FIXME
          this.deadline = trelloTodo.due ? toJapanDateTime(trelloTodo.due) : null;
          this.is_done = trelloTodo.dueComplete;
          this.is_closed = trelloTodo.closed;
          break;
        case TodoAppId.MICROSOFT:
          const microSoftTodo = todoByApi as IMicrosoftTask;
          this.name = microSoftTodo.title;
          this.todoapp_reg_id = microSoftTodo.id;
          this.todoapp_reg_url = replaceString(
            MICROSOFT_BASE_URL.concat("/", microSoftTodo.id), "{tenant}", microSoftPrimaryDomain);
          this.todoapp_reg_created_by = microSoftTodo.userCreateBy;
          this.todoapp_reg_created_at = toJapanDateTime(microSoftTodo.createdDateTime);
          this.start_date = microSoftTodo.dueDateTime;  // FIXME
          this.deadline = microSoftTodo.dueDateTime;
          this.is_done = microSoftTodo.percentComplete === COMPLETED;
          this.is_closed = false;
          break;
      }
    }
  }
}
