import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import User from "../settings/User";
import DocumentTool from "../masters/DocumentTool";

@Entity("s_document_tool_users")
export default class DocumentToolUser extends BaseEntity {
  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  auth_key: string;

  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  document_tool_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  user_name: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  avatar: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  email: string;

  @ManyToOne(
    () => User,
    user => user.documentToolUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(
    () => DocumentTool,
    documentTool => documentTool.documentToolUsers,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "document_tool_id" })
  documentTool: DocumentTool;
}