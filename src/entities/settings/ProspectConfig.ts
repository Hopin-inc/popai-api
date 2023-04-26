import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";
import ProspectTiming from "./ProspectTiming";
import { ValueOf } from "../../types";
import { ChatToolId } from "../../consts/common";

type ConstructorOption = {
  company: Company | string;
  enabled: boolean;
  chatToolId: ValueOf<typeof ChatToolId>;
  channel?: string;
  from?: number;
  fromDaysBefore?: number;
  beginOfWeek?: number;
  to?: number;
  frequency?: number;
  frequencyDaysBefore?: number[];
};

@Entity("s_prospect_configs")
export default class ProspectConfig extends BaseEntity {
  constructor(options: ConstructorOption) {
    super();
    if (options) {
      const { company, enabled, chatToolId, ...optionalConfigs } = options;
      this.companyId = typeof company === "string" ? company : company.id;
      this.enabled = enabled;
      this.chatToolId = chatToolId;
      Object.assign(this, { ...this, ...optionalConfigs });
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "enabled", default: false })
  enabled: boolean;

  @Column({ name: "chat_tool_id", nullable: true })
  chatToolId?: number;

  @Column({ name: "channel", type: "varchar", length: 255, nullable: true })
  channel?: string;

  @Column({ name: "from", type: "tinyint", nullable: true })
  from?: number;

  @Column({ name: "to", type: "tinyint", nullable: true })
  to?: number;

  @Column({ name: "from_days_before", type: "tinyint", nullable: true })
  fromDaysBefore?: number;

  @Column({ name: "begin_of_week", type: "tinyint", nullable: true })
  beginOfWeek?: number;

  @Column({ name: "frequency", type: "tinyint", nullable: true })
  frequency?: number;

  @Column({ name: "frequency_days_before", type: "json", nullable: true })
  frequencyDaysBefore?: number[];

  @OneToOne(
    () => Company,
    company => company.prospectConfig,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToMany(
    () => ProspectTiming,
    timing => timing.config,
    { cascade: true },
  )
  timings: ProspectTiming[];
}
