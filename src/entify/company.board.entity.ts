import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('company_boards')
export class CompanyBoard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  todoapp_id: number;

  @Column()
  board_id: string;
}
