import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "./BaseEntity";
import Company from "./Company";
import Section from "./Section";
import ChatTool from "./ChatTool";
import ProspectTiming from "./ProspectTiming";

@Entity("s_prospect_configs")
export default class ProspectConfig extends BaseEntity {
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
    company => company.notifyConfig,
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
  chat_tool: ChatTool;

  @OneToOne(
    () => ProspectTiming,
    timing => timing.config,
    { cascade: true },
  )
  timing: ProspectTiming;
}