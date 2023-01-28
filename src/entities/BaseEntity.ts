import { Column, CreateDateColumn } from "typeorm";

export default abstract class BaseEntity {
  @CreateDateColumn({ type: "datetime" })
  readonly created_at: Date;

  @Column({ type: "datetime", nullable: true, onUpdate: "CURRENT_TIMESTAMP" })
  readonly updated_at: Date;

  @Column({ type: "datetime", nullable: true })
  deleted_at: Date;
}