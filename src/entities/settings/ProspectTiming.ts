import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import ProspectConfig from "./ProspectConfig";
import { AskMode } from "../../consts/common";

type ConstructorOptions = {
  config: ProspectConfig | number,
  time: string,
  mode: number;
};

@Entity("s_prospect_timings")
export default class ProspectTiming extends BaseEntity {
  constructor(options: ConstructorOptions) {
    super();
    if (options) {
      const { config, ...rest } = options;
      this.configId = typeof config === "number" ? config : config.id;
      Object.assign(this, { ...this, ...rest });
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "config_id" })
  configId: number;

  @Column({ name: "time", type: "time" })
  time: string;

  @Column({ name: "mode", default: AskMode.UNDEFINED })
  mode: number;

  @ManyToOne(
    () => ProspectConfig,
    config => config.timings,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "config_id" })
  config: ProspectConfig;
}
