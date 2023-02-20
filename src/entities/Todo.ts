import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";

import BaseEntity from "./BaseEntity";
import TodoApp from "./TodoApp";
import Company from "./Company";
import TodoUpdateHistory from "./TodoUpdateHistory";
import TodoUser from "./TodoUser";
import TodoSection from "./TodoSection";
import User from "./User";
import Section from "./Section";
import TodoHistory from "./TodoHistory";
import Prospect from "./Prospect";
import { Sorter } from "../utils/common";

@Entity("todos")
export default class Todo extends BaseEntity {
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
  @JoinColumn({ name: "todoapp_id" })
  todoapp: TodoApp;

  @ManyToOne(
    () => Company,
    { onDelete: "SET NULL", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToMany(
    () => TodoUser,
    todoUser => todoUser.todo,
    { cascade: true }
  )
  todoUsers: TodoUser[];

  get users(): User[] {
    const todoUsers = this.todoUsers;
    return todoUsers ? todoUsers.filter(tu => tu.deleted_at === null).map(tu => tu.user) : [];
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
    () => TodoHistory,
    history => history.todo,
    { cascade: false }
  )
  histories: TodoHistory[];

  @OneToMany(
    () => TodoUpdateHistory,
      history => history.todo,
    { cascade: false }
  )
  updateHistories: TodoUpdateHistory[];

  @OneToMany(
    () => Prospect,
    prospect => prospect.todo,
    { cascade: false }
  )
  prospects: Prospect[];

  get latestProspect(): Prospect | null {
    if (this.prospects && this.prospects.length) {
      return this.prospects.sort(Sorter.byDate<Prospect>("created_at")).slice(-1)[0];
    } else {
      return null;
    }
  }
}
