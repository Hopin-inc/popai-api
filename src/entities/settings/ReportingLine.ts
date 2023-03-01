import { Entity, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";

@Entity("reporting_lines")
export default class ReportingLine extends BaseEntity {
  @PrimaryColumn()
  superior_user_id: number;

  @PrimaryColumn()
  subordinate_user_id: number;
}
