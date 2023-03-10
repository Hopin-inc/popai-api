import { Entity, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";

@Entity("s_reporting_lines")
export default class ReportingLine extends BaseEntity {
  @PrimaryColumn()
  superior_user_id: number;

  @PrimaryColumn()
  subordinate_user_id: number;
}
