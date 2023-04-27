import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import BoardConfig from "./BoardConfig";
import PropertyUsage from "./PropertyUsage";
import { ValueOf } from "../../types";
import { TodoAppId } from "../../consts/common";

@Entity("s_boards")
export default class Board extends BaseEntity {
  constructor(todoAppId: ValueOf<typeof TodoAppId>, boardId: string) {
    super();
    this.todoAppId = todoAppId;
    this.appBoardId = boardId;
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "todo_app_id" })
  todoAppId: number;

  @Column({ name: "app_board_id", type: "varchar", length: 255 })
  appBoardId: string;

  @OneToMany(
    () => BoardConfig,
    config => config.board,
    { cascade: true },
  )
  configs: BoardConfig[];

  @OneToMany(
    () => PropertyUsage,
    usage => usage.board,
    { cascade: true },
  )
  propertyUsages: PropertyUsage[];
}
