import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "./base.entity";

@Entity('m_message_types')
export class MessageType extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;
}
