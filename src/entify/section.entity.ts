import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
}
