import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "./BaseEntity";
import Todo from "./Todo";

@Entity("todo_update_histories")
export default class TodoUpdateHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  todo_id: number;

  @Column({ type: "datetime", nullable: true, default: null })
  deadline_before: Date;

  @Column({ type: "datetime", nullable: true, default: null })
  deadline_after: Date;

  @Column()
  is_done: boolean;

  @Column({ type: "datetime" })
  todoapp_reg_updated_at: Date;

  @ManyToOne(
    () => Todo,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;
}
