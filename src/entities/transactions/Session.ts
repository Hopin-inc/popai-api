import { Column, DeleteDateColumn, Entity, Index, PrimaryColumn } from "typeorm";
import { ISession } from "connect-typeorm";

@Entity("t_sessions")
export default class Session implements ISession {
  @PrimaryColumn({ name: "id", type: "varchar", length: 255 })
  readonly id: string;

  @Index()
  @Column({ name: "expired_at", type: "bigint" })
  expiredAt: number = Date.now();

  @Column({ name: "json", type: "text" })
  json: string = "";

  @DeleteDateColumn({ name: "destroyed_at", nullable: true })
  destroyedAt?: Date;
}
