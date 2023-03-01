import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "../settings/User";

@Entity("remind_user_jobs")
export default class RemindUserJob extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column({ default: 0 })
  status: number;

  @ManyToOne(
    () => User,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
