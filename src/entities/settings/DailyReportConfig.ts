import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";
import Section from "./Section";
import ChatTool from "../masters/ChatTool";
import DailyReportTiming from "./DailyReportTiming";

@Entity("s_daily_report_configs")
export default class DailyReportConfig extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column({ nullable: true })
  section_id?: number;

  @Column({ default: false })
  enabled: boolean;

  @Column({ nullable: true })
  chat_tool_id: number;

  @Column({ type: "varchar", length: 12, collation: "utf8mb4_unicode_ci", nullable: true })
  channel: string;

  @OneToOne(
    () => Company,
    company => company.dailyReportConfig,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToOne(
    () => Section,
    section => section.dailyReportConfig,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "section_id" })
  section?: Section;

  @ManyToOne(
    () => ChatTool,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "chat_tool_id" })
  chat_tool: ChatTool;

  @OneToOne(
    () => DailyReportTiming,
    timing => timing.config,
    { cascade: true },
  )
  timing: DailyReportTiming;
}