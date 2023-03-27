import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";
import Section from "./Section";
import ChatTool from "../masters/ChatTool";
import ProspectTiming from "./ProspectTiming";

type ConstructorOption = {
  company: Company | number;
  section?: Section | number;
  enabled: boolean;
  chatTool?: ChatTool | number;
  channel?: string;
  from?: number;
  fromDaysBefore?: number;
  beginOfWeek?: number;
  to?: number;
  frequency?: number;
  frequencyDaysBefore?: number[];
};

@Entity("s_prospect_configs")
export default class ProspectConfig extends BaseEntity {
  constructor(options: ConstructorOption) {
    super();
    if (options) {
      const { company, section, enabled, chatTool, ...optionalConfigs } = options;
      super();
      this.company_id = typeof company === "number" ? company : company.id;
      this.enabled = enabled;
      if (section) {
        this.section_id = typeof section === "number" ? section : section.id;
      }
      if (chatTool) {
        this.chat_tool_id = typeof chatTool === "number" ? chatTool : chatTool.id;
      }
      Object.assign({ ...this, ...optionalConfigs });
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

  @Column({ type: "tinyint", nullable: true })
  from: number;

  @Column({ type: "tinyint", nullable: true })
  to: number;

  @Column({ type: "tinyint", nullable: true })
  from_days_before: number;

  @Column({ type: "tinyint", nullable: true })
  begin_of_week: number;

  @Column({ type: "tinyint", nullable: true })
  frequency: number;

  @Column({ type: "json", nullable: true })
  frequency_days_before: number[];

  @OneToOne(
    () => Company,
    company => company.prospectConfig,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToOne(
    () => Section,
    section => section.notifyConfig,
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

  @OneToMany(
    () => ProspectTiming,
    timing => timing.config,
    { cascade: true },
  )
  timings: ProspectTiming[];
}