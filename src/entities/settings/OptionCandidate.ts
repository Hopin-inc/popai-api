import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";

import BaseEntity from "../BaseEntity";
import PropertyOption from "./PropertyOption";
import Property from "./Property";
import User from "@/entities/settings/User";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import { IDailyReportItems } from "@/types";

@Entity("option_candidates")
export default class OptionCandidate extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  property_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  option_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  name: string;

  @ManyToOne(
    () => Property,
    property => property.id,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "property_id" })
  property: Property;

  @OneToMany(
    () => PropertyOption,
    propertyOption => propertyOption.id,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "id" })
  propertyOptions: PropertyOption[];

  constructor(
    property: Property | number,
    optionId: string,
    name: string,
  ) {
    super();
    if (property && optionId && name) {
      this.property_id = typeof property === "number" ? property : property.id;
      this.option_id = optionId;
      this.name = name;
    }
  }
}