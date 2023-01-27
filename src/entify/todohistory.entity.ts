import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Column } from "typeorm";
import BaseEntity from "./base.entity";
import { Todo } from "./todo.entity";
import { User } from "./user.entity";

@Entity("todo_histories")
export class TodoHistory extends BaseEntity {
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
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
