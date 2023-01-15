import { Entity, Column, PrimaryGeneratedColumn, OneToMany, JoinColumn, ManyToOne } from "typeorm";
import { Company } from "./company.entity";
import { Section } from "./section.entity";
import BaseEntity from "./base.entity";
import { ChatToolUser } from "./chattool.user.entity";
import { TodoAppUser } from "./todoappuser.entity";
import { TodoUser } from "./todouser.entity";
import { ChatTool } from "./chat_tool.entity";
import { Todo } from "./todo.entity";
import { TodoApp } from "./todoapp.entity";

@Entity("users")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ nullable: true })
  company_id: number;

  @OneToMany(
    () => TodoAppUser,
    todoAppUsers => todoAppUsers.user,
    { cascade: true }
  )
  todoAppUsers: TodoAppUser[];

  get todoApps(): TodoApp[] {
    return this.todoAppUsers.map(record => record.todoApp);
  }

  @OneToMany(
    () => ChatToolUser,
    chattoolUser => chattoolUser.user,
    { cascade: true }
  )
  chattoolUsers: ChatToolUser[];

  get chatTools(): ChatTool[] {
    return this.chattoolUsers.map(record => record.chattool);
  }

  @OneToMany(
    () => Section,
    section => section.boardAdminUser,
    { cascade: false }
  )
  adminSections: Section[];

  @ManyToOne(
    () => Company,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToMany(
    () => TodoUser,
    todoUser => todoUser.user,
    { cascade: true }
  )
  todoUsers: TodoUser[];

  get todos(): Todo[] {
    return this.todoUsers.map(record => record.todo);
  }
}
