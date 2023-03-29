import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";

@Entity("s_company_conditions")
export default class CompanyCondition extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  remind_before_days: number;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "company_id" })
  company: Company;
}
