import { Column, CreateDateColumn } from "typeorm";

export default class BaseEntity {
  @CreateDateColumn({ type: "datetime" })
  created_at: Date;

  @Column({ type: "datetime", nullable: true, onUpdate: "CURRENT_TIMESTAMP" })
  updated_at: Date;

  @Column({ type: "datetime", nullable: true })
  deleted_at: Date;
}