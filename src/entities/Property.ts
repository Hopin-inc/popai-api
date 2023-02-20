import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";

import BaseEntity from "./BaseEntity";
import Section from "./Section";

@Entity("properties")
export default class Property extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  section_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  property_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column()
  type: number;

  @Column({ nullable: true })
  usage: number;

  @OneToOne(
    () => Section,
    section => section,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "section_id" })
  section: Section;
}