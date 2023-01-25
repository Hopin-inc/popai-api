import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "./BaseEntity";
import Section from "./Section";
import Todo from "./Todo";

@Entity("todo_sections")
export default class TodoSection extends BaseEntity {
  @PrimaryColumn()
  todo_id: number;

  @PrimaryColumn()
  section_id: number;

  @ManyToOne(
    () => Todo,
    todo => todo.todoSections,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;

  @ManyToOne(
    () => Section,
    section => section.todoSections,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn({ name: "section_id" })
  section: Section;
}
