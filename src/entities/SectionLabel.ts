import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToOne } from "typeorm";

import BaseEntity from "./BaseEntity";
import Section from "./Section";

@Entity("section_labels")
export default class SectionLabel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column()
  section_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  label_id: string;

  @OneToOne(
    () => Section,
    section => section.sectionLabel,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "section_id" })
  section: Section;
}