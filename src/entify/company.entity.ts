import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { TodoApp } from './todoapp.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(
    () => TodoApp,
    (todoapp) => todoapp.companies
  )
  @JoinTable({
    name: 'implemented_todo_apps',
    joinColumn: {
      name: 'company_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'todoapp_id',
      referencedColumnName: 'id',
    },
  })
  todoapps: TodoApp[];
}
