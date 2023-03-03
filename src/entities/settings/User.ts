import { Entity, Column, PrimaryGeneratedColumn, OneToMany, JoinColumn, ManyToOne, OneToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import Section from "./Section";
import ChatToolUser from "./ChatToolUser";
import TodoAppUser from "./TodoAppUser";
import TodoUser from "../transactions/TodoUser";
import ChatTool from "../masters/ChatTool";
import Todo from "../transactions/Todo";
import TodoApp from "../masters/TodoApp";
import Prospect from "../transactions/Prospect";
import { ChatToolCode } from "../../consts/common";

@Entity("users")
export default class User extends BaseEntity {
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
    const lineUser = this.chattoolUsers.find(record => record.chattool.tool_code === ChatToolCode.LINE);
    return lineUser ? lineUser.auth_key : null;
  }

  get slackId(): string | null {
    const slackUser = this.chattoolUsers.find(record => record.chattool.tool_code === ChatToolCode.SLACK);
    return slackUser ? slackUser.auth_key : null;
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
    () => Prospect,
    prospect => prospect.user,
    { cascade: false },
  )
  prospects: Prospect[];
}
