import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";
import BaseEntity from "./base.entity";

@Entity('remind_user_jobs')
export class RemindUserJob extends BaseEntity {
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
  @JoinColumn({ name: 'user_id' })
  user: User;
}
