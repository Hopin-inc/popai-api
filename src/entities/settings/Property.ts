import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne, OneToMany } from "typeorm";

import BaseEntity from "../BaseEntity";
import Section from "./Section";
import PropertyOption from "./PropertyOption";

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

  @ManyToOne(
    () => Section,
    section => section.properties,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "section_id" })
  section: Section;

  @OneToMany(
    () => PropertyOption,
    propertyOption => propertyOption.property,
    { cascade: false })
  propertyOptions: PropertyOption[];
}