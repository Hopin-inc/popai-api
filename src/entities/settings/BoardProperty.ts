import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne, OneToMany } from "typeorm";

import BaseEntity from "../BaseEntity";
import Section from "./Section";
import PropertyOption from "./PropertyOption";
import OptionCandidate from "./OptionCandidate";

@Entity("s_properties")
export default class BoardProperty extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  section_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  property_id: string;

  @Column()
  type: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @ManyToOne(
    () => Section,
    section => section.properties,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "section_id" })
  section: Section;

  @OneToMany(
    () => OptionCandidate,
    optionCandidate => optionCandidate.id,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "id" })
  optionCandidates: OptionCandidate[];

  @OneToMany(
    () => PropertyOption,
    propertyOption => propertyOption.property_id,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "id" })
  propertyOptions: PropertyOption[];

  constructor(
    section: Section | number,
    propertyId: string,
    type: number,
    name: string,
  ) {
    super();
    if (section && propertyId && type && name) {
      this.section_id = typeof section === "number" ? section : section.id;
      this.property_id = propertyId;
      this.type = type;
      this.name = name;
    }
  }
}