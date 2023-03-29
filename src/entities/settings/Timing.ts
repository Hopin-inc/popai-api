import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";
import Section from "./Section";
import Timezone from "../masters/Timezone";

@Entity("s_timings")
export default class Timing extends BaseEntity {
  constructor(
    company: Company | number,
    disabledOnHolidaysJp: boolean,
    daysOfWeek: number[] = [],
    section?: Section | number,
    timezone: Timezone | string = "Asia/Tokyo",
  ) {
    super();
    if (company && daysOfWeek) {
      this.company_id = typeof company === "number" ? company : company.id;
      this.disabled_on_holidays_jp = disabledOnHolidaysJp;
      this.days_of_week = daysOfWeek;
      this.timezone_name = typeof timezone === "string" ? timezone : timezone.zone_name;
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

  @Column({ type: "varchar", length: 35, collation: "utf8mb4_unicode_ci", nullable: true })
  timezone_name: string;

  @Column({ type: "json", nullable: true })
  days_of_week?: number[];

  @Column({ default: false })
  disabled_on_holidays_jp: boolean;

  @OneToOne(
    () => Company,
    company => company.timing,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToOne(
    () => Section,
    section => section.timing,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "section_id" })
  section?: Section;

  @ManyToOne(
    () => Timezone,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "timezone_name" })
  timezone: Timezone;
}