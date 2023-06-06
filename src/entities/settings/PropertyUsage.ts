import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Board from "./Board";

type ConstructorOptions = {
  todoAppId: number;
  board: Board | number;
  appPropertyId: string;
  type: number;
  usage: number;
  appOptions?: string[];
  boolValue?: boolean;
};

@Entity("s_property_usages")
export default class PropertyUsage extends BaseEntity {
  constructor(options: ConstructorOptions) {
    super();
    if (options) {
      const { board, ...rest } = options;
      this.boardId = typeof board === "number" ? board : board.id;
      Object.assign(this, { ...this, ...rest });
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "todo_app_id" })
  todoAppId: number;

  @Column({ name: "board_id" })
  boardId: number;

  @Index()
  @Column({ name: "app_property_id", type: "varchar", length: 255 })
  appPropertyId: string;

  @Column({ name: "type" })
  type: number;

  @Column({ name: "usage" })
  usage: number;

  @Column({ name: "app_options", type: "json", nullable: true })
  appOptions?: string[];

  @Column({ name: "bool_value", nullable: true })
  boolValue?: boolean;

  @ManyToOne(
    () => Board,
    board => board.propertyUsages,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "board_id" })
  board: Board;
}
