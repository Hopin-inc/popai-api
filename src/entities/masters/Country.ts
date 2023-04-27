import { Column, Entity, PrimaryColumn } from "typeorm";
import BaseEntity from "../BaseEntity";

@Entity("m_countries")
export default class Country extends BaseEntity {
  @PrimaryColumn({ name: "code", type: "char", length: 2 })
  code: string;

  @Column({ name: "name", type: "varchar", length: 45 })
  name: string;
}
