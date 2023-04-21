import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";

@Entity("s_accounts")
export default class Account extends BaseEntity {
  constructor(
    uid: string,
    email: string,
    name: string,
    company: Company | string,
    emailVerified: boolean = false,
  ) {
    super();
    if (company) {
      this.uid = uid;
      this.email = email;
      this.name = name;
      this.companyId = typeof company === "string" ? company : company.id;
      this.emailVerified = emailVerified;
    }
  }

  @PrimaryColumn({ name: "uid", type: "varchar", length: 255 })
  uid: string;

  @Column({ name: "email", type: "varchar", length: 255 })
  email: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "email_verified", default: false })
  emailVerified: boolean;

  @ManyToOne(
    () => Company,
    company => company.accounts,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;
}
