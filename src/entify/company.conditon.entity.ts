import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('m_company_conditions')
export class CompanyCondion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  remind_before_days: number;

  @ManyToOne(
    () => User,
    (user) => user.companyCondition
  )
  @JoinColumn({ name: 'company_id' })
  user: User;
}
