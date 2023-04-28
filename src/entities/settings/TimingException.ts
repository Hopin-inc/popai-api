import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";

@Entity("s_timing_exceptions")
export default class TimingException extends BaseEntity {
  constructor(
    company: Company | string,
    date: Date | string,
    excluded: boolean,
  ) {
    super();
    if (company) {
      this.companyId = typeof company === "string" ? company : company.id;
      this.date = typeof date === "string" ? new Date(date) : date;
      this.excluded = excluded;
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "date", type: "date", nullable: true })
  date?: Date;

  @Column({ name: "excluded", default: true })
  excluded: boolean;

  @ManyToOne(
    () => Company,
    company => company.timingExceptions,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;
}
