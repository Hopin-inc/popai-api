import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import PropertyUsage from "./PropertyUsage";
import Company from "./Company";

type ConstructorOptions = {
  todoAppId: number;
  company: Company | string;
  appBoardId: string;
  projectRule?: number;
};

@Entity("s_boards")
export default class Board extends BaseEntity {
  constructor(options: ConstructorOptions) {
    super();
    if (options) {
      const { company, ...rest } = options;
      this.companyId = typeof company === "string" ? company : company.id;
      Object.assign(this, { ...this, ...rest });
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "todo_app_id" })
  todoAppId: number;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "app_board_id", type: "varchar", length: 255 })
  appBoardId: string;

  @Column({ name: "project_rule", nullable: true })
  projectRule?: number;

  @ManyToOne(
    () => Company,
    company => company.boards,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToMany(
    () => PropertyUsage,
    usage => usage.board,
    { cascade: true },
  )
  propertyUsages: PropertyUsage[];
}
