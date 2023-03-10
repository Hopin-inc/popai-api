import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Property from "./Property";
import OptionCandidate from "./OptionCandidate";

@Entity("property_options")
export default class PropertyOption extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  property_id: number;

  @Column({ nullable: true })
  option_id: number;

  @Column({ nullable: true })
  usage: number;

  @ManyToOne(
    () => Property,
    property => property.propertyOptions,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "property_id" })
  property: Property;

  @ManyToOne(
    () => OptionCandidate,
    optionCandidate => optionCandidate.propertyOptions,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "option_id" })
  optionCandidate?: OptionCandidate;
}