import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("reporting_lines")
export class ReportingLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  superior_user_id: number;

  @Column()
  subordinate_user_id: number;
}
