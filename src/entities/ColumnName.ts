import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";

import BaseEntity from "./BaseEntity";
import Section from "./Section";

@Entity("column_names")
export default class ColumnName extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  section_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  label_todo: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  label_section: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  label_is_done: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  label_is_archived: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  label_assignee: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  label_due: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  label_created_at: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  label_created_by: string;

  @OneToOne(
    () => Section,
    section => section,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "section_id" })
  section: Section;
}