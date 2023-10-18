import { Column, Entity, JoinColumn, OneToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Company from "./Company";
import { ISetupFeatureId } from "@/types/setup";
import SetupFeature from "./SetupFeature";

type ConstructorOption = {
  company: Company | string,
  currentStep?: number,
  setupTodoAppId?: number,
  setupChatToolId?: number,
  setupFeatures?: ISetupFeatureId[],
};

@Entity("s_setup_configs")
export default class SetupConfig extends BaseEntity {
  constructor(option: ConstructorOption) {
    super();
    if (option) {
      const { company, ...rest } = option;
      this.companyId = typeof company === "string" ? company : company.id;
      Object.assign(this, { ...this, ...rest });
    }
  }
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "current_step", nullable: true })
  currentStep: number;

  @Column({ name: "setup_todo_app_id", nullable: true })
  setupTodoAppId: number;

  @Column({ name: "setup_chat_tool_id", nullable: true })
  setupChatToolId: number;

  @OneToOne(
    () => Company,
    company => company.setupConfig,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToMany(
    () => SetupFeature,
    feature => feature.setupConfig,
    { cascade: true },
  )
  features: SetupFeature[];
}
