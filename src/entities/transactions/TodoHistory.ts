import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import BaseEntity from "../BaseEntity";
import Todo from "./Todo";

type ConstructorOptions = {
  todo: Todo | string;
  property: number;
  action: number;
  startDate?: Date;
  deadline?: Date;
  userIds?: string[];
  daysDiff?: number;
  appUpdatedAt?: Date;
};

@Entity("t_todo_histories")
export default class TodoHistory extends BaseEntity {
  constructor(options: ConstructorOptions) {
    super();
    if (options) {
      const { todo, ...rest } = options;
      this.todoId = typeof todo === "string" ? todo : todo.id;
      Object.assign(this, { ...this, ...rest });
    }
  }

  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({ name: "todo_id" })
  todoId: string;

  @Index()
  @Column({ name: "property" })
  property: number;

  @Index()
  @Column({ name: "action" })
  action: number;

  @Column({ name: "start_date", nullable: true })
  startDate?: Date;

  @Column({ name: "deadline", nullable: true })
  deadline?: Date;

  @Column({ name: "user_ids", type: "json", nullable: true })
  userIds?: string[];

  @Column({ name: "days_diff", nullable: true })
  daysDiff?: number;

  @Column({ name: "app_updated_at", nullable: true })
  appUpdatedAt?: Date;

  @ManyToOne(
    () => Todo,
    todo => todo.todoUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;
}
