import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "./BaseEntity";
import Company from "./Company";

@Entity("m_event_timings")
export default class EventTiming extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column({ type: "tinyint", width: 1 })
  event: number;

  @Column({ type: "json" })
  days_of_week: number[];

  @Column({ type: "time" })
  time: string;

  @Column({ nullable: true })
  ask_plan: boolean;

  @ManyToOne(
    () => Company,
    company => company.eventTimings,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;
}