import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("implemented_todo_apps")
export class ImplementedTodoApp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  auth_key: string;

  @Column()
  primary_domain: string;

  @Column()
  company_id: number;

  @Column()
  todoapp_id: number;
}
