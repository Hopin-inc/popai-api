import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Section from "../settings/Section";
import User from "../settings/User";
import Company from "../settings/Company";
import { IDailyReportItems } from "../../types";

@Entity("t_daily_reports")
export default class DailyReport extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  company_id: number;

  @Column({ type: "json" })
  todo_ids_yesterday: number[];

  @Column({ type: "json" })
  todo_ids_delayed: number[];

  @Column({ type: "json" })
  todo_ids_ongoing: number[];

  @Column({ type: "json" })
  section_ids: number[];

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  slack_channel_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  slack_ts: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  doc_app_reg_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  doc_app_reg_url: string;

  @ManyToOne(
    () => User,
    user => user.prospects,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  constructor(
    user: User | number,
    company: Company | number,
    sections: Section[] | number[],
    items: IDailyReportItems,
    slackChannelId?: string,
    slackTs?: string,
    docAppRegId?: string,
    docAppRegUrl?: string,
  ) {
    super();
    if (user && company && sections && items) {
      this.user_id = typeof user === "number" ? user : user.id;
      this.company_id = typeof company === "number" ? company : company.id;
      this.todo_ids_yesterday = items.completedYesterday.map(todo => todo.id);
      this.todo_ids_delayed = items.delayed.map(todo => todo.id);
      this.todo_ids_ongoing = items.ongoing.map(todo => todo.id);
      this.section_ids = sections.map(section => typeof section === "number" ? section : section.id);

      // Prefer
      this.slack_channel_id = slackChannelId ? slackChannelId : this.slack_channel_id;
      this.slack_ts = slackTs ? slackTs : this.slack_ts;
      this.doc_app_reg_id = docAppRegId ? docAppRegId : this.doc_app_reg_id;
      this.doc_app_reg_url = docAppRegUrl ? docAppRegUrl : this.doc_app_reg_url;
    }
  }
}