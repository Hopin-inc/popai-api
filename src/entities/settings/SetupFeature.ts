import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import SetupConfig from "./SetupConfig";
import { ISetupFeatureId } from "@/types/setup";

type ConstructorOption = {
  config: SetupConfig | number,
  feature?: ISetupFeatureId,
};

@Entity("s_setup_features")
export default class SetupFeature extends BaseEntity {
  constructor(option: ConstructorOption) {
    super();
    if (option) {
      this.configId = typeof option.config === "number" ? option.config : option.config.id;
      this.feature = option.feature;
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "setup_config_id" })
  configId: number;

  @Column({ name: "feature" })
  feature: number;

  @ManyToOne(
    () => SetupConfig,
    config => config.features,
    { onDelete: "CASCADE", onUpdate: "RESTRICT", orphanedRowAction: "delete" },
  )
  @JoinColumn({ name: "setup_config_id" })
  setupConfig: SetupConfig;
}
