import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import BaseEntity from "../BaseEntity";
import Todo from "./Todo";
import User from "../settings/User";
import { ValueOf } from "@/types";
import { TodoHistoryAction as Action, TodoHistoryProperty as Property } from "@/consts/common";

type Info = { deadline?: Date, assignee?: User, daysDiff?: number };

@Entity("t_todo_histories")
export default class TodoHistory extends BaseEntity {
  constructor(
    todo: Todo | string,
    assignees: User[],
    property: ValueOf<typeof Property>,
    action: ValueOf<typeof Action>,
    updatedAt: Date,
    info?: Info | null,
  ) {
    super();
    if (todo && assignees && property && action && updatedAt) {
      this.todoId = typeof todo === "string" ? todo : todo.id;
      this.property = property;
      this.action = action;
      this.appUpdatedAt = updatedAt;

      // Optional
      this.deadline = info?.deadline ?? null;
      this.daysDiff = info?.daysDiff ?? null;
      this.userId = info?.assignee ? info.assignee.id : null;
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

  @Column({ name: "deadline", nullable: true })
  deadline?: Date;

  @Column({ name: "user_id", nullable: true })
  userId?: string;

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

  @ManyToOne(
    () => User,
    user => user.todoUsers,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
