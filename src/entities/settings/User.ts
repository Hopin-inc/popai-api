import {
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import ChatToolUser from "./ChatToolUser";
import TodoAppUser from "./TodoAppUser";
import ReportingLine from "./ReportingLine";
import TodoUser from "../transactions/TodoUser";
import Todo from "../transactions/Todo";
import Prospect from "../transactions/Prospect";
import Remind from "../transactions/Remind";

@Entity("s_users")
export default class User extends BaseEntity {
  constructor(name: string, company: Company | string) {
    super();
    this.name = name;
    if (company) {
      this.companyId = typeof company === "string" ? company : company.id;
    }
  }

  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "company_id" })
  companyId: string;

  @ManyToOne(
    () => Company,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToOne(
    () => TodoAppUser,
    todoAppUser => todoAppUser.user,
    { cascade: true },
  )
  todoAppUser: TodoAppUser;

  @OneToOne(
    () => ChatToolUser,
    chatToolUser => chatToolUser.user,
    { cascade: true },
  )
  chatToolUser: ChatToolUser;

  @OneToMany(
    () => TodoUser,
    todoUser => todoUser.user,
    { cascade: true },
  )
  todoUsers: TodoUser[];
  todos: Todo[] = [];

  @OneToMany(
    () => ReportingLine,
    reportingLine => reportingLine.superiorUser,
    { cascade: true },
  )
  subordinateUserRefs: ReportingLine[];
  subordinateUsers: User[] = [];

  @OneToMany(
    () => ReportingLine,
    reportingLine => reportingLine.subordinateUser,
    { cascade: true },
  )
  superiorUserRefs: ReportingLine[];
  superiorUsers: User[] = [];

  @OneToMany(
    () => Prospect,
    prospect => prospect.user,
    { cascade: false },
  )
  prospects: Prospect[];

  @OneToMany(
    () => Remind,
    remind => remind.user,
    { cascade: false },
  )
  reminds: Remind[];

  @AfterLoad()
  setTodos() {
    this.todos = this.todoUsers
      ? this.todoUsers.filter(tu => !tu.deletedAt).map(tu => tu.todo)
      : [];
  }

  @AfterLoad()
  setReportingLines() {
    this.subordinateUsers = this.subordinateUserRefs
      ? this.subordinateUserRefs.filter(ref => !ref.deletedAt).map(ref => ref.subordinateUser)
      : [];
    this.superiorUsers = this.superiorUserRefs
      ? this.superiorUserRefs.filter(ref => !ref.deletedAt).map(ref => ref.superiorUser)
      : [];
  }
}
