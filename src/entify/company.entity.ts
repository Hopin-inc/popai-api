import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany, ManyToOne } from "typeorm";
import { CompanyCondition } from './company.conditon.entity';
import { User } from './user.entity';
import { Section } from "./section.entity";
import { Todo } from "./todo.entity";
import BaseEntity from "./base.entity";
import { ImplementedTodoApp } from "./implemented.todoapp.entity";
import { ImplementedChatTool } from "./implemented.chattool.entity";
import { TodoApp } from "./todoapp.entity";
import { ChatTool } from "./chat_tool.entity";

@Entity('companies')
export class Company extends BaseEntity {
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
    return this.implementedTodoApps.map(record => record.todoApp);
  }

  @OneToMany(
    () => ImplementedChatTool,
    implementedChatTool => implementedChatTool.company,
    { cascade: true }
  )
  implementedChatTools: ImplementedChatTool[];

  get chatTools(): ChatTool[] {
    return this.implementedChatTools.map(record => record.chattool);
  }

  @ManyToOne(
    () => User,
    user => user.id,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'admin_user_id' })
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
