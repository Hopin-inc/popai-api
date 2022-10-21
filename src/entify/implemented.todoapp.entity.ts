import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('implemented_todo_apps')
export class ImplementedTodoApp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  auth_key: string;

  @Column()
  application_id: string;

  @Column()
  tenant_id: string;

  @Column()
  client_secret: string;
}
