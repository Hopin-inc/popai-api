import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("remind_user_jobs")
export class RemindUserJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  status: number;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;
}
