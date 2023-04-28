import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";
import Timezone from "../masters/Timezone";

@Entity("s_timings")
export default class Timing extends BaseEntity {
  constructor(
    company: Company | string,
    disabledOnHolidaysJp: boolean,
    daysOfWeek: number[] = [],
    timezone: Timezone | string = "Asia/Tokyo",
  ) {
    super();
    if (company && daysOfWeek) {
      this.companyId = typeof company === "string" ? company : company.id;
      this.disabledOnHolidaysJp = disabledOnHolidaysJp;
      this.daysOfWeek = daysOfWeek;
      this.timezoneName = typeof timezone === "string" ? timezone : timezone.name;
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "timezone_name", type: "varchar", length: 35, nullable: true })
  timezoneName?: string;

  @Column({ name: "days_of_week", type: "json", nullable: true })
  daysOfWeek?: number[];

  @Column({ name: "disabled_on_holidays_jp", default: false })
  disabledOnHolidaysJp: boolean;

  @OneToOne(
    () => Company,
    company => company.timing,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(
    () => Timezone,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "timezone_name" })
  timezone?: Timezone;
}
