import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';
import BaseEntity from "./base.entity";

@Entity('m_company_conditions')
export class CompanyCondition extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  remind_before_days: number;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
