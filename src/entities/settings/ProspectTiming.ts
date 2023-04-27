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
      this.configId = typeof config === "number" ? config : config.id;
      this.time = time;
      this.askPlan = askPlan;
      if (askPlanMilestone) {
        this.askPlanMilestone = askPlanMilestone;
      }
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "config_id" })
  configId: number;

  @Column({ name: "time", type: "time" })
  time: string;

  @Column({ name: "ask_plan", default: false })
  askPlan: boolean;

  @Column({ name: "ask_plan_milestone", type: "time", nullable: true })
  askPlanMilestone?: string;

  @ManyToOne(
    () => ProspectConfig,
    config => config.timings,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "config_id" })
  config: ProspectConfig;
}
