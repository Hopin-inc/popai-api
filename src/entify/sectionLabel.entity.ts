import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToOne } from 'typeorm';
import { Section } from './section.entity';
import BaseEntity from "./base.entity";

@Entity('section_labels')
export class SectionLabel extends BaseEntity {
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
  @JoinColumn({ name: 'section_id' })
  section: Section;
}