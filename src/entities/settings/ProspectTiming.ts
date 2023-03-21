import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import ProspectConfig from "./ProspectConfig";

@Entity("s_prospect_timings")
export default class ProspectTiming extends BaseEntity {
  constructor(
    config: ProspectConfig | number,
    time: string,
    askPlan: boolean,
    askPlanMilestone?: string,
  ) {
    super();
    if (config) {
      this.config_id = typeof config === "number" ? config : config.id;
      this.time = time;
      this.ask_plan = askPlan;
      if (askPlanMilestone) {
        this.ask_plan_milestone = askPlanMilestone;
      }
    }
  }

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

  @ManyToOne(
    () => ProspectConfig,
    config => config.timings,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "config_id" })
  config: ProspectConfig;
}