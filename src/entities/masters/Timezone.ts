import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Country from "./Country";

@Entity("m_timezones")
export default class Timezone extends BaseEntity {
  @PrimaryColumn({ name: "name", type: "varchar", length: 35 })
  name: string;

  @Column({ name: "country_code", type: "char", length: 2 })
  countryCode: string;

  @Column({ name: "gmt_offset" })
  gmtOffset: number;

  @Column({ name: "timestamp" })
  timestamp: number;

  @ManyToOne(
    () => Country,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "country_code" })
  country: Country;
}
