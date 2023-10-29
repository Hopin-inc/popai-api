import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";
import RemindTiming from "./RemindTiming";
import { RemindType } from "../../consts/common";

type ConstructorOption = {
  company: Company | string;
  type: number;
  enabled: boolean;
  chatToolId: number;
  channel?: string;
  frequency?: number;
  limit?: number;
};

@Entity("s_remind_configs")
export default class RemindConfig extends BaseEntity {
  constructor(options: ConstructorOption) {
    super();
    if (options) {
      const { company, ...rest } = options;
      this.companyId = typeof company === "string" ? company : company.id;
      Object.assign(this, { ...this, ...rest });
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "type", default: RemindType.TODOS })
  type: number;

  @Column({ name: "enabled", default: false })
  enabled: boolean;

  @Column({ name: "chat_tool_id", nullable: true })
  chatToolId?: number;

  @Column({ name: "channel", type: "varchar", length: 255, nullable: true })
  channel?: string;

  @Column({ name: "frequency", type: "tinyint", nullable: true })
  frequency?: number;

  @Column({ name: "limit", nullable: true })
  limit?: number;

  @Column({ name: "report_after_recovery", type: "tinyint", nullable: true, default: false })
  reportAfterRecovery?: boolean;

  @ManyToOne(
    () => Company,
    company => company.remindConfigs,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToMany(
    () => RemindTiming,
    timing => timing.config,
    { cascade: true },
  )
  timings: RemindTiming[];
}
