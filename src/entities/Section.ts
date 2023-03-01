import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";

import BaseEntity from "./BaseEntity";
import User from "./User";
import Company from "./Company";
import TodoApp from "./TodoApp";
import TodoSection from "./TodoSection";
import SectionLabel from "./SectionLabel";
import Property from "./Property";
import Timing from "./Timing";
import TimingException from "./TimingException";
import DailyReportConfig from "./DailyReportConfig";
import NotifyConfig from "./NotifyConfig";

@Entity("sections")
export default class Section extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ nullable: true })
  company_id: number;

  @Column({ nullable: true })
  todoapp_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  board_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  label_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  channel_id: string;

  @Column({ nullable: true })
  board_admin_user_id: number;

  @ManyToOne(
    () => Company,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(
    () => TodoApp,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todoapp_id" })
  todoapp: TodoApp;

  @ManyToOne(
    () => User,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "board_admin_user_id" })
  boardAdminUser: User;

  @OneToMany(
    () => TodoSection,
    todoSection => todoSection.section,
    { cascade: true },
  )
  todoSections: TodoSection[];

  get sections(): Section[] {
    const todoSections = this.todoSections;
    return todoSections ? todoSections.map(record => record.section) : [];
  }

  @OneToMany(() => Property, property => property.section)
  properties: Property[];

  @OneToOne(
    () => SectionLabel,
    sectionLabel => sectionLabel.section,
    { eager: true },
  )
  sectionLabel: SectionLabel;

  @OneToOne(
    () => Timing,
    timing => timing.section,
    { cascade: true }
  )
  timing?: Timing;

  @OneToMany(
    () => TimingException,
    exception => exception.section,
    { cascade: true }
  )
  timingExceptions?: TimingException[];

  @OneToOne(
    () => DailyReportConfig,
    config => config.section,
    { cascade: true }
  )
  dailyReportConfig?: DailyReportConfig;

  @OneToOne(
    () => NotifyConfig,
    config => config.section,
    { cascade: true }
  )
  notifyConfig?: NotifyConfig;
}
