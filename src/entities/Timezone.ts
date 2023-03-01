import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import BaseEntity from "./BaseEntity";
import Country from "./Country";

@Entity("m_timezones")
export default class Timezone extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 35, collation: "utf8mb4_unicode_ci" })
  zone_name: string;

  @Column({ type: "char", length: 2, collation: "utf8mb4_unicode_ci" })
  country_code: string;

  @Column()
  gmt_offset: number;

  @Column()
  timestamp: number;

  @ManyToOne(
    () => Country,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "country_code" })
  country: Country;
}