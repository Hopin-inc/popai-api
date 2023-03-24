import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";
import Section from "./Section";
import Board from "./Board";

@Entity("s_board_configs")
export default class BoardConfig extends BaseEntity {
  constructor(company: Company | number, board: Board | number, section?: Section | number) {
    super();
    if (company && board) {
      this.company_id = typeof company === "number" ? company : company.id;
      this.board_id = typeof board === "number" ? board : board.id;
      if (section) {
        this.section_id = typeof section === "number" ? section : section.id;
      }
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column({ nullable: true })
  section_id?: number;

  @Column()
  board_id: number;

  @OneToOne(
    () => Company,
    company => company.boardConfigs,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToOne(
    () => Section,
    section => section.boardConfig,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "section_id" })
  section: Section;

  @ManyToOne(
    () => Board,
    board => board.configs,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "board_id" })
  board: Board;
}
