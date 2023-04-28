import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Board from "./Board";
import { ValueOf } from "../../types";
import { TodoAppId } from "../../consts/common";

@Entity("s_property_usages")
export default class PropertyUsage extends BaseEntity {
  constructor(
    todoAppId: ValueOf<typeof TodoAppId>,
    board: Board | number,
    propertyId: string,
    type: number,
    usage: number,
    options?: string[],
    boolValue?: boolean,
  ) {
    super();
    if (board) {
      this.todoAppId = todoAppId;
      this.boardId = typeof board === "number" ? board : board.id;
      this.appPropertyId = propertyId;
      this.type = type;
      this.usage = usage;
      if (options) {
        this.appOptions = options;
      }
      if (boolValue !== undefined) {
        this.boolValue = boolValue;
      }
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
