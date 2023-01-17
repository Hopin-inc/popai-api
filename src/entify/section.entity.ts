import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { User } from './user.entity';
import { Company } from "./company.entity";
import { TodoApp } from "./todoapp.entity";
import { TodoSection } from "./todo.section.entity";
import { SectionLabel } from "./sectionLabel.entity";

@Entity('sections')
export class Section {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ nullable: true })
  company_id: number;

  @Column({ nullable: true })
  todoapp_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  board_id: string;

  @Column()
  channel_id: string;

  @Column({ nullable: true })
  board_admin_user_id: number;

  @ManyToOne(
    () => Company,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(
    () => TodoApp,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'todoapp_id' })
  todoapp: TodoApp;

  @ManyToOne(
    () => User,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'board_admin_user_id' })
  boardAdminUser: User;

  @OneToMany(
    () => TodoSection,
    todoSection => todoSection.section,
    { cascade: true }
  )
  todoSections: TodoSection[];

  get sections(): Section[] {
    const todoSections = this.todoSections;
    return todoSections ? todoSections.map(record => record.section) : [];
  }

  @OneToOne(
    () => SectionLabel,
    sectionLabel => sectionLabel.section,
    { eager: true }
  )
  sectionLabel: SectionLabel;
}
