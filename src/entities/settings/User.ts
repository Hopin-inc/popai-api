import { Entity, Column, PrimaryGeneratedColumn, OneToMany, JoinColumn, ManyToOne, OneToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import ChatToolUser from "./ChatToolUser";
import TodoAppUser from "./TodoAppUser";
import ReportingLine from "./ReportingLine";
import TodoUser from "../transactions/TodoUser";
import Todo from "../transactions/Todo";
import Prospect from "../transactions/Prospect";

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

  @OneToMany(
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

  get todos(): Todo[] {
    const todoUsers = this.todoUsers;
    return todoUsers ? todoUsers.filter(tu => !tu.deletedAt).map(tu => tu.todo) : [];
  }

  @OneToMany(
    () => ReportingLine,
    reportingLine => reportingLine.superiorUser,
    { cascade: true },
  )
  subordinateUserRefs: ReportingLine[];

  get subordinateUsers(): User[] {
    const refs = this.subordinateUserRefs;
    return refs ? refs.filter(ref => !ref.deletedAt).map(ref => ref.subordinateUser) : [];
  }

  @OneToMany(
    () => ReportingLine,
    reportingLine => reportingLine.subordinateUser,
    { cascade: true },
  )
  superiorUserRefs: ReportingLine[];

  get superiorUsers(): User[] {
    const refs = this.superiorUserRefs;
    return refs ? refs.filter(ref => !ref.deletedAt).map(ref => ref.superiorUser) : [];
  }

  @OneToMany(
    () => Prospect,
    prospect => prospect.user,
    { cascade: false },
  )
  prospects: Prospect[];
}
