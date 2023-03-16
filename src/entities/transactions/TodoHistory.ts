import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Column } from "typeorm";
import BaseEntity from "../BaseEntity";
import Todo from "./Todo";
import User from "../settings/User";
import { valueOf } from "@/types";
import { TodoHistoryAction as Action, TodoHistoryProperty as Property } from "@/consts/common";

type Info = { deadline?: Date, assignee?: User, daysDiff?: number };

@Entity("t_todo_histories")
export default class TodoHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  todo_id: number;

  @Column()
  property: number;

  @Column()
  action: number;

  @Column({ nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  user_id: number;

  @Column({ nullable: true })
  days_diff: number;

  @Column({ nullable: true })
  edited_by: number;

  @Column()
  todoapp_reg_updated_at: Date;

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

  constructor(
    todo: Todo | number,
    assignees: User[],
    property: valueOf<typeof Property>,
    action: valueOf<typeof Action>,
    updatedAt: Date,
    info?: Info | null,
    editedBy?: number,
  ) {
    super();
    if (todo && assignees && property && action && updatedAt) {
      this.todo_id = typeof todo === "number" ? todo : todo.id;
      this.property = property;
      this.action = action;
      this.todoapp_reg_updated_at = updatedAt;

      //Prefer
      this.deadline = info?.deadline ?? null;
      this.days_diff = info?.daysDiff ?? null;
      this.user_id = info?.assignee ? info.assignee.id : null;
      this.edited_by = editedBy ? editedBy : null;
    }
  }
}
