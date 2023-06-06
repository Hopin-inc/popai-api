import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";

import BaseEntity from "../BaseEntity";
import Todo from "./Todo";
import Project from "./Project";

@Entity("t_todo_projects")
export default class TodoProject extends BaseEntity {
  constructor(todo: Todo | string, project: Project | string) {
    super();
    if (todo && project) {
      this.todoId = typeof todo === "string" ? todo : todo.id;
      this.projectId = typeof project === "string" ? project : project.id;
    }
  }

  @PrimaryColumn({ name: "todo_id" })
  todoId: string;

  @PrimaryColumn({ name: "project_id" })
  projectId: string;

  @ManyToOne(
    () => Todo,
    todo => todo.todoProjects,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "todo_id" })
  todo: Todo;

  @ManyToOne(
    () => Project,
    project => project.todoProjects,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "project_id" })
  project: Project;
}
