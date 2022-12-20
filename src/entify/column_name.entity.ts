import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('column_name')
export class ColumnName {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  board_id: number;

  @Column()
  todo: string;

  @Column()
  section: string;

  @Column()
  is_done: string;

  @Column()
  is_archive: string;

  @Column()
  assignee: string;

  @Column()
  due: string;

  @Column()
  created_by: string;

  @Column()
  created_at: string;
}