import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany, ManyToOne, OneToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import CompanyCondition from "./CompanyCondition";
import User from "./User";
import Section from "./Section";
import Todo from "../transactions/Todo";
import ImplementedTodoApp from "./ImplementedTodoApp";
import ImplementedChatTool from "./ImplementedChatTool";
import TodoApp from "../masters/TodoApp";
import ChatTool from "../masters/ChatTool";
import EventTiming from "./EventTiming";
import Timing from "./Timing";
import TimingException from "./TimingException";
import DailyReportConfig from "./DailyReportConfig";
import NotifyConfig from "./NotifyConfig";
import Account from "./Account";

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

  constructor(name: string) {
    super();
    this.name = name;
    this.is_demo = false;
  }

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

  @OneToMany(
    () => Account,
    account => account.company,
    { cascade: true }
  )
  accounts: Account[];

  @OneToMany(
    () => EventTiming,
    timing => timing.company,
    { cascade: true }
  )
  eventTimings: EventTiming[];

  @OneToOne(
    () => Timing,
    timing => timing.company,
    { cascade: true }
  )
  timing: Timing;

  @OneToMany(
    () => TimingException,
    exception => exception.company,
    { cascade: true }
  )
  timingExceptions: TimingException[];

  @OneToOne(
    () => DailyReportConfig,
    config => config.company,
    { cascade: true }
  )
  dailyReportConfig: DailyReportConfig;

  @OneToOne(
    () => NotifyConfig,
    config => config.company,
    { cascade: true }
  )
  notifyConfig: NotifyConfig;
}
