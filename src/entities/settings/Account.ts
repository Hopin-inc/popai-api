import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";

@Entity("s_accounts")
export default class Account extends BaseEntity {
  constructor(uid: string, email: string, name: string, company: Company | number) {
    super();
    if (company) {
      this.uid = uid;
      this.email = email;
      this.name = name;
      this.company_id = typeof company === "number" ? company : company.id;
    }
  }

  @PrimaryColumn({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  uid: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  email: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column()
  company_id: number;

  @ManyToOne(
    () => Company,
    company => company.accounts,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;
}