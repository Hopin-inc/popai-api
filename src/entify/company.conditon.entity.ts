import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('m_company_conditions')
export class CompanyCondion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  remind_before_days: number;
}
