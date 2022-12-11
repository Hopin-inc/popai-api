import { Entity, Column, PrimaryGeneratedColumn, Unique, JoinColumn, OneToOne } from 'typeorm';
import { Section } from './section.entity';

@Entity('label_sections')
export class LabelSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  board_id: number;

  @Column()
  label_id: string;

  @OneToOne(
    () => Section,
    (section) => section.id,
  )
  @JoinColumn({ name: 'board_id', referencedColumnName: 'id' })
  section: Section;
}