import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany, ManyToOne } from "typeorm";

import BaseEntity from "./BaseEntity";
import CompanyCondition from "./CompanyCondition";
import User from "./User";
import Section from "./Section";
import Todo from "./Todo";
import ImplementedTodoApp from "./ImplementedTodoApp";
import ImplementedChatTool from "./ImplementedChatTool";
import TodoApp from "./TodoApp";
import ChatTool from "./ChatTool";

@Entity("companies")
export default class Company extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ nullable: true })
  admin_user_id: number;

  @Column({ default: false })
  is_demo: boolean;

  @OneToMany(
    () => ImplementedTodoApp,
    implementedTodoApp => implementedTodoApp.company,
    { cascade: true }
  )
  implementedTodoApps: ImplementedTodoApp[];

  get todoApps(): TodoApp[] {
    const implementedTodoApps = this.implementedTodoApps;
    return implementedTodoApps ? implementedTodoApps.map(record => record.todoApp) : [];
  }

  @OneToMany(
    () => ImplementedChatTool,
    implementedChatTool => implementedChatTool.company,
    { cascade: true }
  )
  implementedChatTools: ImplementedChatTool[];

  get chatTools(): ChatTool[] {
    const implementedChatTools = this.implementedChatTools;
    return implementedChatTools ? implementedChatTools.map(record => record.chattool) : [];
  }

  @ManyToOne(
    () => User,
    user => user.id,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "admin_user_id" })
  adminUser: User;

  @OneToMany(
    () => CompanyCondition,
    condition => condition.company,
    { cascade: true }
  )
  companyConditions: CompanyCondition[];

  @OneToMany(
    () => User,
    user => user.company,
    { cascade: true }
  )
  users: User[];

  @OneToMany(
    () => Section,
    section => section.company,
    { cascade: true }
  )
  sections: Section[];

  @OneToMany(
    () => Todo,
    todo => todo.company,
    { cascade: true }
  )
  todos: Todo[];
}
