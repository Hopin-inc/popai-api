import { Column, DeleteDateColumn, Entity, Index, PrimaryColumn } from "typeorm";
import { ISession } from "connect-typeorm";

@Entity("t_sessions")
export default class Session implements ISession {
  @PrimaryColumn({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  id: string;

  @Index()
  @Column({ name: "expired_at", type: "bigint" })
  expiredAt: number = Date.now();

  @Column({ type: "text" })
  json: string = "";

  @DeleteDateColumn({ name: "destroyed_at", nullable: true })
  destroyedAt?: Date;
}