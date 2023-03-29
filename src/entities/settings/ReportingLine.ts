import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "./User";

@Entity("s_reporting_lines")
export default class ReportingLine extends BaseEntity {
  constructor(subordinateUser: User | number, superiorUser: User | number) {
    super();
    if (subordinateUser && superiorUser) {
      this.subordinate_user_id = typeof subordinateUser === "number" ? subordinateUser : subordinateUser.id;
      this.superior_user_id = typeof superiorUser === "number" ? superiorUser : superiorUser.id;
    }
  }

  @PrimaryColumn()
  superior_user_id: number;

  @PrimaryColumn()
  subordinate_user_id: number;

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
