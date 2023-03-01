import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
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

  @OneToOne(
    () => ProspectConfig,
    config => config.timing,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "config_id" })
  config: ProspectConfig;
}