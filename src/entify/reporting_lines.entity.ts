import { Entity, PrimaryColumn } from "typeorm";
import BaseEntity from "./base.entity";

@Entity('reporting_lines')
export class ReportingLine extends BaseEntity {
  @PrimaryColumn()
  superior_user_id: number;

  @PrimaryColumn()
  subordinate_user_id: number;
}
