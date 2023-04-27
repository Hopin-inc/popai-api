import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "./User";

@Entity("s_reporting_lines")
export default class ReportingLine extends BaseEntity {
  constructor(subordinateUser: User | string, superiorUser: User | string) {
    super();
    if (subordinateUser && superiorUser) {
      this.subordinateUserId = typeof subordinateUser === "string" ? subordinateUser : subordinateUser.id;
      this.superiorUserId = typeof superiorUser === "string" ? superiorUser : superiorUser.id;
    }
  }

  @PrimaryColumn({ name: "superior_user_id" })
  superiorUserId: string;

  @PrimaryColumn({ name: "subordinate_user_id" })
  subordinateUserId: string;

  @ManyToOne(
    () => User,
    user => user.subordinateUserRefs,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "superior_user_id" })
  superiorUser: User;

  @ManyToOne(
    () => User,
    user => user.superiorUserRefs,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "subordinate_user_id" })
  subordinateUser: User;
}
