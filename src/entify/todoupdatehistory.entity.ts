import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('todo_update_histories')
export class TodoUpdateHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  todo_id: number;

  @Column()
  todoapp_reg_updated_at: Date;
}
