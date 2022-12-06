import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('column_name')
export class Section {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nameColumn: string;

  @Column()
  isDoneColumn: string;

  @Column()
  assigneeColumn: string;

  @Column()
  dueColumn: string;
}