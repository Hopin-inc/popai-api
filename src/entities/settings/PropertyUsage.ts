import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Board from "./Board";

@Entity("s_property_usages")
export default class PropertyUsage extends BaseEntity {
  constructor(
    board: Board | number,
    propertyId: string,
    type: number,
    usage: number,
    options?: string[],
    boolValue?: boolean,
  ) {
    super();
    if (board) {
      this.board_id = typeof board === "number" ? board : board.id;
      this.app_property_id = propertyId;
      this.type = type;
      this.usage = usage;
      if (options) {
        this.app_options = options;
      }
      if (boolValue !== undefined) {
        this.bool_value = boolValue;
      }
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  board_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  app_property_id: string;

  @Column()
  type: number;

  @Column()
  usage: number;

  @Column({ type: "json", nullable: true })
  app_options?: string[];

  @Column({ nullable: true })
  bool_value?: boolean;

  @ManyToOne(
    () => Board,
    board => board.propertyUsages,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "board_id" })
  board: Board;
}
