import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "@/entities/settings/User";

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

  @Column()
  user_id: number;
}
