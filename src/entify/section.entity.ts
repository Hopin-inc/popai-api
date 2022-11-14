import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('sections')
export class Section {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  company_id: number;

  @Column()
  todoapp_id: number;

  @Column()
  board_id: string;

  @Column()
  board_admin_user_id: number;

  @OneToOne(
    () => User,
    (user) => user.section
  )
  @JoinColumn({ name: 'board_admin_user_id' })
  boardAdminUser: User;
}
