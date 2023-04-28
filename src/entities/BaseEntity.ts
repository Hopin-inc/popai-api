import { Column, CreateDateColumn, DeleteDateColumn } from "typeorm";

export default abstract class BaseEntity {
  @CreateDateColumn({ name: "created_at", type: "datetime" })
  readonly createdAt: Date;

  @Column({ name: "updated_at", type: "datetime", nullable: true, onUpdate: "CURRENT_TIMESTAMP" })
  readonly updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "datetime", nullable: true })
  deletedAt: Date;
}
