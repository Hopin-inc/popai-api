import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('column_name')
@Unique(['company_id', 'todoapp_id'])
export class ColumnName {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  todoapp_id: number;

  @Column()
  todo: string;

  @Column()
  is_done: string;

  @Column()
  assignee: string;

  @Column()
  due: string;

  @Column()
  created_by: string;

  @Column()
  created_at: string;
}