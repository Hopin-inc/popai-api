import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";
import Board from "./Board";

@Entity("s_board_configs")
export default class BoardConfig extends BaseEntity {
  constructor(company: Company | string, board: Board | number) {
    super();
    if (company && board) {
      this.companyId = typeof company === "string" ? company : company.id;
      this.boardId = typeof board === "number" ? board : board.id;
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "board_id" })
  boardId: number;

  @OneToOne(
    () => Company,
    company => company.boardConfigs,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(
    () => Board,
    board => board.configs,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "board_id" })
  board: Board;
}
