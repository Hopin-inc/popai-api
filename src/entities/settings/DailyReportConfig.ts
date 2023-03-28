import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";
import Section from "./Section";
import ChatTool from "../masters/ChatTool";
import DailyReportTiming from "./DailyReportTiming";
import DocumentTool from "../masters/DocumentTool";

@Entity("s_daily_report_configs")
export default class DailyReportConfig extends BaseEntity {
  constructor(
    company: Company | number,
    enabled: boolean,
    chatTool?: ChatTool | number,
    channel?: string,
    section?: Section | number,
  ) {
    super();
    if (company) {
      this.company_id = typeof company === "number" ? company : company.id;
      this.enabled = enabled;
      if (chatTool) {
        this.chat_tool_id = typeof chatTool === "number" ? chatTool : chatTool.id;
      }
      if (channel) {
        this.channel = channel;
      }
      if (section) {
        this.section_id = typeof section === "number" ? section : section.id;
      }
    }
  }

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

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  channel: string;

  @Column({ nullable: true })
  document_tool_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  database: string;

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
  chatTool: ChatTool;

  @ManyToOne(
    () => DocumentTool,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "document_tool_id" })
  documentTool: DocumentTool;

  @OneToMany(
    () => DailyReportTiming,
    timing => timing.config,
    { cascade: true },
  )
  timings: DailyReportTiming[];
}