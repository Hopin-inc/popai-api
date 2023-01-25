import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

import BaseEntity from "./BaseEntity";

@Entity("m_message_types")
export default class MessageType extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;
}
