import { Column, Entity, PrimaryColumn } from "typeorm";
import BaseEntity from "../BaseEntity";

@Entity("m_countries")
export default class Country extends BaseEntity {
  @PrimaryColumn({ type: "char", length: 2, collation: "utf8mb4_unicode_ci" })
  code: number;

  @Column({ type: "varchar", length: 45, collation: "utf8mb4_unicode_ci" })
  name: string;
}