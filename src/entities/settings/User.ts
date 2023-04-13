import { Entity, Column, PrimaryGeneratedColumn, OneToMany, JoinColumn, ManyToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import Section from "./Section";
import ChatToolUser from "./ChatToolUser";
import TodoAppUser from "./TodoAppUser";
import DocumentToolUser from "./DocumentToolUser";
import ReportingLine from "./ReportingLine";
import TodoUser from "../transactions/TodoUser";
import ChatTool from "../masters/ChatTool";
import Todo from "../transactions/Todo";
import TodoApp from "../masters/TodoApp";
import Prospect from "../transactions/Prospect";
import { ChatToolId, DocumentToolId } from "../../consts/common";
import DocumentTool from "../masters/DocumentTool";

@Entity("s_users")
export default class User extends BaseEntity {
  constructor(name: string, company?: Company | number) {
    super();
    this.name = name;
    if (company) {
      this.company_id = typeof company === "number" ? company : company.id;
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ nullable: true })
  company_id: number;

  @OneToMany(
    () => TodoAppUser,
    todoAppUsers => todoAppUsers.user,
    { cascade: true },
  )
  todoAppUsers: TodoAppUser[];

  get todoApps(): TodoApp[] {
    const todoAppUsers = this.todoAppUsers;
    return todoAppUsers ? todoAppUsers.map(record => record.todoApp) : [];
  }

  @OneToMany(
    () => ChatToolUser,
    chattoolUser => chattoolUser.user,
    { cascade: true },
  )
  chattoolUsers: ChatToolUser[];

  get chatTools(): ChatTool[] {
    const chattoolUsers = this.chattoolUsers;
    return chattoolUsers ? chattoolUsers.map(record => record.chattool) : [];
  }

  get lineId(): string | null {
    const lineUser = this.chattoolUsers.find(record => record.chattool.id === ChatToolId.LINE);
    return lineUser ? lineUser.auth_key : null;
  }

  get slackId(): string | null {
    const slackUser = this.chattoolUsers.find(record => record.chattool.id === ChatToolId.SLACK);
    return slackUser ? slackUser.auth_key : null;
  }

  @OneToMany(
    () => DocumentToolUser,
    documentToolUser => documentToolUser.user,
    { cascade: true },
  )
  documentToolUsers: DocumentToolUser[];

  get documentTools(): DocumentTool[] {
    const documentToolUsers = this.documentToolUsers;
    return documentToolUsers ? documentToolUsers.map(record => record.documentTool) : [];
  }

  get notionId(): string | null {
    const notionUser = this.documentToolUsers.find(record => record.documentTool.id === DocumentToolId.NOTION);
    return notionUser ? notionUser.auth_key : null;
  }

  @OneToMany(
    () => Section,
    section => section.boardAdminUser,
    { cascade: false },
  )
  adminSections: Section[];

  @ManyToOne(
    () => Company,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToMany(
    () => TodoUser,
    todoUser => todoUser.user,
    { cascade: true },
  )
  todoUsers: TodoUser[];

  get todos(): Todo[] {
    const todoUsers = this.todoUsers;
    return todoUsers ? todoUsers.filter(tu => !tu.deleted_at).map(tu => tu.todo) : [];
  }

  @OneToMany(
    () => ReportingLine,
    reportingLine => reportingLine.superiorUser,
    { cascade: true },
  )
  subordinateUserRefs: ReportingLine[];

  get subordinateUsers(): User[] {
    const refs = this.subordinateUserRefs;
    return refs ? refs.filter(ref => !ref.deleted_at).map(ref => ref.subordinateUser) : [];
  }

  @OneToMany(
    () => ReportingLine,
    reportingLine => reportingLine.subordinateUser,
    { cascade: true },
  )
  superiorUserRefs: ReportingLine[];

  get superiorUsers(): User[] {
    const refs = this.superiorUserRefs;
    return refs ? refs.filter(ref => !ref.deleted_at).map(ref => ref.superiorUser) : [];
  }

  @OneToMany(
    () => Prospect,
    prospect => prospect.user,
    { cascade: false },
  )
  prospects: Prospect[];
}
