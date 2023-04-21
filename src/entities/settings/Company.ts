import { Entity, Column, PrimaryGeneratedColumn, OneToMany, OneToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "./User";
import Todo from "../transactions/Todo";
import ImplementedTodoApp from "./ImplementedTodoApp";
import ImplementedChatTool from "./ImplementedChatTool";
import Timing from "./Timing";
import TimingException from "./TimingException";
import Account from "./Account";
import BoardConfig from "./BoardConfig";
import ProspectConfig from "./ProspectConfig";

@Entity("s_companies")
export default class Company extends BaseEntity {
  constructor(name: string) {
    super();
    this.name = name;
  }

  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @OneToMany(
    () => Account,
    account => account.company,
    { cascade: true },
  )
  accounts: Account[];

  @OneToOne(
    () => ImplementedTodoApp,
    implementedTodoApp => implementedTodoApp.company,
    { cascade: true },
  )
  implementedTodoApp: ImplementedTodoApp;

  @OneToMany(
    () => ImplementedChatTool,
    implementedChatTool => implementedChatTool.company,
    { cascade: true },
  )
  implementedChatTool: ImplementedChatTool;

  @OneToMany(
    () => User,
    user => user.company,
    { cascade: true },
  )
  users: User[];

  @OneToMany(
    () => Todo,
    todo => todo.company,
    { cascade: true },
  )
  todos: Todo[];

  @OneToOne(
    () => Timing,
    timing => timing.company,
    { cascade: true },
  )
  timing: Timing;

  @OneToMany(
    () => TimingException,
    exception => exception.company,
    { cascade: true },
  )
  timingExceptions: TimingException[];

  @OneToOne(
    () => ProspectConfig,
    config => config.company,
    { cascade: true },
  )
  prospectConfig: ProspectConfig;

  @OneToOne(
    () => BoardConfig,
    config => config.company,
    { cascade: true },
  )
  boardConfigs: BoardConfig[];
}
