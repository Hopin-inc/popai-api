import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from "typeorm";

import BaseEntity from "./BaseEntity";
import Property from "./Property";

@Entity("property_options")
export default class PropertyOption extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  property_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  option_id: string;

  @Column({ nullable: true })
  usage: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  name: string;

  @ManyToOne(
    () => Property,
    property => property.propertyOptions,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" })
  @JoinColumn({ name: "property_id" })
  property: Property;
}