import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Section from "../settings/Section";
import Todo from "./Todo";

@Entity("t_todo_sections")
export default class TodoSection extends BaseEntity {
  constructor(todo: Todo | number, section: Section | number) {
    super();
    if (todo && section) {
      this.todo_id = typeof todo === "number" ? todo : todo.id;
      this.section_id = typeof section === "number" ? section : section.id;
    }
  }

  @PrimaryColumn()
  todo_id: number;

  @PrimaryColumn()
  section_id: number;

  @ManyToOne(
    () => Todo,
    todo => todo.todoSections,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;

  @ManyToOne(
    () => Section,
    section => section.todoSections,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "section_id" })
  section: Section;
}
