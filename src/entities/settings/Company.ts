import { Entity, Column, OneToMany, OneToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "./User";
import Todo from "../transactions/Todo";
import ImplementedTodoApp from "./ImplementedTodoApp";
import ImplementedChatTool from "./ImplementedChatTool";
import Timing from "./Timing";
import TimingException from "./TimingException";
import ProspectConfig from "./ProspectConfig";
import Board from "./Board";
import Project from "../transactions/Project";
import RemindConfig from "./RemindConfig";
import SetupConfig from "./SetupConfig";

@Entity("s_companies")
export default class Company extends BaseEntity {
  constructor(uid: string, name?: string) {
    super();
    this.id = uid;
    if (name) {
      this.name = name;
    }
  }

  @PrimaryColumn({ name: "id", type: "varchar", length: 255 })
  readonly id: string;

  @Column({ name: "name", type: "varchar", length: 255, nullable: true })
  name?: string;

  @OneToMany(
    () => ImplementedTodoApp,
    implementedTodoApp => implementedTodoApp.company,
    { cascade: true },
  )
  implementedTodoApps: ImplementedTodoApp[];

  @OneToOne(
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

  @OneToMany(
    () => Project,
    project => project.company,
    { cascade: true },
  )
  projects: Project[];

  @OneToOne(
    () => Timing,
    timing => timing.company,
    { cascade: true },
  )
  timing: Timing;

  @OneToOne(
    () => SetupConfig,
    config => config.company,
    { cascade: true },
  )
  setupConfig: SetupConfig;

  @OneToMany(
    () => TimingException,
    exception => exception.company,
    { cascade: true },
  )
  timingExceptions: TimingException[];

  @OneToMany(
    () => ProspectConfig,
    config => config.company,
    { cascade: true },
  )
  prospectConfigs: ProspectConfig[];

  @OneToMany(
    () => RemindConfig,
    config => config.company,
    { cascade: true },
  )
  remindConfigs: RemindConfig[];

  @OneToMany(
    () => Board,
    board => board.company,
    { cascade: true },
  )
  boards: Board[];
}
