import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "./BaseEntity";
import Company from "./Company";
import Section from "./Section";

@Entity("s_timing_exceptions")
export default class TimingException extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column({ nullable: true })
  section_id?: number;

  @Column({ type: "date", nullable: true })
  date: Date;

  @Column({ default: true })
  excluded: boolean;

  @ManyToOne(
    () => Company,
    company => company.timingExceptions,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(
    () => Section,
    section => section.timingExceptions,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "section_id" })
  section?: Section;
}