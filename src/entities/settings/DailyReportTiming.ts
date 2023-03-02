import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import DailyReportConfig from "./DailyReportConfig";

@Entity("s_daily_report_timings")
export default class DailyReportTiming extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  config_id: number;

  @Column({ type: "time" })
  time: string;

  @Column({ default: false })
  enable_pending: boolean;

  @ManyToOne(
    () => DailyReportConfig,
    config => config.timings,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "config_id" })
  config: DailyReportConfig;
}