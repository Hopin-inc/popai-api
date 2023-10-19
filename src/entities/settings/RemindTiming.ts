import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import RemindConfig from "./RemindConfig";

type ConstructorOptions = {
  config: RemindConfig | number,
  time: string,
  mode?: number;
};

@Entity("s_remind_timings")
export default class RemindTiming extends BaseEntity {
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

  @ManyToOne(
    () => RemindConfig,
    config => config.timings,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "config_id" })
  config: RemindConfig;
}
