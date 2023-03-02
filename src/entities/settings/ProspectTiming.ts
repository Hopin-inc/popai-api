import { Column, Entity, JoinColumn, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import ProspectConfig from "./ProspectConfig";

@Entity("s_prospect_timings")
export default class ProspectTiming extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  config_id: number;

  @Column({ type: "time" })
  time: string;

  @Column({ default: false })
  ask_plan: boolean;

  @Column({ type: "time", nullable: true })
  ask_plan_milestone: string;

  @OneToMany(
    () => ProspectConfig,
    config => config.timings,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "config_id" })
  config: ProspectConfig;
}