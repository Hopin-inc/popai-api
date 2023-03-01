import { Entity, Column, PrimaryColumn } from "typeorm";

import BaseEntity from "../BaseEntity";

@Entity("line_profiles")
export default class LineProfile extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  line_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  display_name: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  picture_url: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  status_message: string;
}
