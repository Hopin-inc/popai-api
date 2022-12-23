import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  JoinColumn,
  OneToOne,
  OneToMany,
} from "typeorm";
import { ChatTool } from "./chatTool.entity";
import { CompanyCondion } from "./company.conditon.entity";
import { TodoApp } from "./todoapp.entity";
import { User } from "./user.entity";

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  admin_user_id: number;

  @Column()
  is_demo: boolean;

  @ManyToMany(
    () => TodoApp,
    (todoapp) => todoapp.companies
  )
  @JoinTable({
    name: "implemented_todo_apps",
    joinColumn: {
      name: "company_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "todoapp_id",
      referencedColumnName: "id",
    },
  })
  todoapps: TodoApp[];

  @ManyToMany(
    () => ChatTool,
    (chattool) => chattool.companies
  )
  @JoinTable({
    name: "implemented_chat_tools",
    joinColumn: {
      name: "company_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "chattool_id",
      referencedColumnName: "id",
    },
  })
  chattools: ChatTool[];

  @OneToOne(
    () => User,
    (user) => user.id
  )
  @JoinColumn({ name: "admin_user_id" })
  admin_user: User;

  @OneToMany(
    () => CompanyCondion,
    (conditon) => conditon.company
  )
  @JoinColumn({ name: "id", referencedColumnName: "company_id" })
  companyConditions: CompanyCondion[];

  @OneToMany(
    () => User,
    (user) => user.company
  )
  users: User[];
}
