import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import BoardProperty from "./BoardProperty";
import OptionCandidate from "./OptionCandidate";

@Entity("s_property_options")
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
    () => BoardProperty,
    property => property.propertyOptions,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "property_id" })
  boardProperty: BoardProperty;

  @ManyToOne(
    () => OptionCandidate,
    optionCandidate => optionCandidate.propertyOptions,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "option_id" })
  optionCandidate?: OptionCandidate;

  constructor(
    property: BoardProperty | number,
    option?: OptionCandidate | number,
    usage?: number,
  ) {
    super();
    if (property) {
      this.property_id = typeof property === "number" ? property : property.id;
    }
    if (option) {
      this.option_id = typeof option === "number" ? option : option.id;
    }
    if (usage) {
      this.usage = usage;
    }
  }
}