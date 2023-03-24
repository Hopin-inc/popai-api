import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import TodoApp from "../masters/TodoApp";
import BoardConfig from "./BoardConfig";
import PropertyUsage from "./PropertyUsage";

@Entity("s_boards")
export default class Board extends BaseEntity {
  constructor(todoApp: TodoApp | number, boardId: string) {
    super();
    if (todoApp) {
      this.todo_app_id = typeof todoApp === "number" ? todoApp : todoApp.id;
      this.app_board_id = boardId;
    }
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  todo_app_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  app_board_id: string;

  @ManyToOne(
    () => TodoApp,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todo_app_id" })
  todoApp: TodoApp;

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
