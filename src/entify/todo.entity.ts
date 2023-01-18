import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { TodoApp } from './todoapp.entity';
import { Company } from "./company.entity";
import { TodoUpdateHistory } from "./todoupdatehistory.entity";
import BaseEntity from "./base.entity";
import { TodoUser } from "./todouser.entity";
import { TodoSection } from "./todo.section.entity";
import { User } from "./user.entity";
import { Section } from "./section.entity";

@Entity('todos')
export class Todo extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ nullable: true })
  todoapp_id: number;

  @Column({ nullable: true })
  company_id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  todoapp_reg_id: string;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci", nullable: true })
  todoapp_reg_url: string;

  @Column({ nullable: true })
  todoapp_reg_created_by: number;

  @Column({ type: "datetime" })
  todoapp_reg_created_at: Date;

  @Column({ type: "datetime", nullable: true, default: null })
  deadline: Date;

  @Column({ nullable: true })
  is_done: boolean;

  @Column({ nullable: true })
  is_reminded: boolean;

  @Column({ default: 0 })
  delayed_count: number;

  @Column({ default: false })
  is_closed: boolean;

  @Column({ default: 0 })
  reminded_count: number;

  @Column({ type: "datetime", nullable: true, default: null })
  first_ddl_set_at: Date;

  @Column({ type: "datetime", nullable: true, default: null })
  first_assigned_at: Date;

  @ManyToOne(
    () => TodoApp,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'todoapp_id' })
  todoapp: TodoApp;

  @ManyToOne(
    () => Company,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(
    () => TodoUser,
    todoUser => todoUser.todo,
    { cascade: true }
  )
  todoUsers: TodoUser[];

  get users(): User[] {
    const todoUsers = this.todoUsers;
    return todoUsers ? todoUsers.map(record => record.user) : [];
  }

  @OneToMany(
    () => TodoSection,
    todoSection => todoSection.todo,
    { cascade: false }
  )
  todoSections: TodoSection[];

  get sections(): Section[] {
    const todoSections = this.todoSections;
    return todoSections ? todoSections.map(record => record.section) : [];
  }

  @OneToMany(
    () => TodoUpdateHistory,
      history => history.todo,
    { cascade: false }
  )
  updateHistories: TodoUpdateHistory[];
}
