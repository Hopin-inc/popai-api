import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import BaseEntity from "./base.entity";
import { Section } from "./section.entity";
import { Todo } from "./todo.entity";

@Entity('todo_sections')
export class TodoSection extends BaseEntity {
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
