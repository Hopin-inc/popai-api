import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Todo from "./Todo";
import User from "../settings/User";
import Company from "../settings/Company";
import { ValueOf } from "../../types";
import { ChatToolId } from "../../consts/common";

@Entity("t_prospects")
export default class Prospect extends BaseEntity {
  constructor(
    todo: Todo | string,
    user: User | string,
    company: Company | string,
    chatToolId?: ValueOf<typeof ChatToolId>,
    appChannelId?: string,
    appThreadId?: string,
  ) {
    super();
    if (todo && user && company) {
      this.todoId = typeof todo === "string" ? todo : todo.id;
      this.userId = typeof user === "string" ? user : user.id;
      this.companyId = typeof company === "string" ? company : company.id;
      if (chatToolId) {
        this.chatToolId = chatToolId;
      }
      if (appChannelId) {
        this.appChannelId = appChannelId;
      }
      if (appThreadId) {
        this.appThreadId = appThreadId;
      }
    }
  }

  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column({ name: "todo_id" })
  todoId: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "company_id" })
  companyId: string;

  @Column({ name: "chat_tool_id", nullable: true })
  chatToolId?: number;

  @Index()
  @Column({ name: "app_channel_id", type: "varchar", length: 255, nullable: true })
  appChannelId?: string;

  @Index()
  @Column({ name: "app_thread_id", type: "varchar", length: 255, nullable: true })
  appThreadId?: string;

  @Index()
  @Column({ name: "app_view_id", type: "varchar", length: 255, nullable: true })
  appViewId?: string;

  @Column({ name: "prospect_value", type: "tinyint", width: 1, nullable: true })
  prospectValue?: number;

  @Column({ name: "prospect_responded_at", type: "datetime", nullable: true })
  prospectRespondedAt?: Date;

  @Column({ name: "action_value", type: "tinyint", width: 1, nullable: true })
  actionValue?: number;

  @Column({ name: "action_responded_at", type: "datetime", nullable: true })
  actionRespondedAt?: Date;

  @Column({ name: "comment", type: "text", nullable: true })
  comment?: string;

  @Column({ name: "comment_responded_at", type: "datetime", nullable: true })
  commentRespondedAt?: Date;

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
}
