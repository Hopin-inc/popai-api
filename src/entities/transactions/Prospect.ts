import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Todo from "./Todo";
import User from "../settings/User";
import Company from "../settings/Company";

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

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  slack_channel_id?: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  slack_ts?: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  slack_view_id?: string;

  @Column({ type: "tinyint", width: 1, nullable: true })
  prospect?: number;

  @Column({ type: "datetime", nullable: true })
  prospect_responded_at?: Date;

  @Column({ type: "tinyint", width: 1, nullable: true })
  action?: number;

  @Column({ type: "datetime", nullable: true })
  action_responded_at?: Date;

  @Column({ type: "text", collation: "utf8mb4_unicode_ci", nullable: true })
  comment?: string;

  @Column({ type: "datetime", nullable: true })
  comment_responded_at?: Date;

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

  constructor(todoId: number, userId: number, companyId: number, slackTs?: string, slackChannelId?: string) {
    super();
    this.todo_id = todoId;
    this.user_id = userId;
    this.company_id = companyId;
    if (slackTs) {
      this.slack_ts = slackTs;
    }
    if (slackChannelId) {
      this.slack_channel_id = slackChannelId;
    }
  }
}
