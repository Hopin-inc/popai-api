import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "./BaseEntity";
import Todo from "./Todo";
import User from "./User";
import Company from "./Company";

@Entity("prospects")
export default class Prospect extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  todo_id: number;

  @Column()
  user_id: number;

  @Column()
  company_id: number;

  @Column({ type: "tinyint", width: 1, nullable: true })
  prospect: number;

  @Column({ type: "tinyint", width: 1, nullable: true })
  action: number;

  @ManyToOne(
    () => Todo,
    todo => todo.prospects,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;

  @ManyToOne(
    () => User,
    user => user.prospects,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  constructor(todoId: number, userId: number, companyId: number) {
    super();
    this.todo_id = todoId;
    this.user_id = userId;
    this.company_id = companyId;
  }
}
