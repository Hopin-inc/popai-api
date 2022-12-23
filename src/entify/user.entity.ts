import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToOne,
  ManyToOne,
} from "typeorm";
import { ChatTool } from "./chatTool.entity";
import { CompanyCondion } from "./company.conditon.entity";
import { Company } from "./company.entity";
import { Section } from "./section.entity";
import { TodoAppUser } from "./todoappUser.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  company_id: number;

  @OneToMany(
    () => CompanyCondion,
    (conditon) => conditon.user
  )
  @JoinColumn({ name: "company_id", referencedColumnName: "company_id" })
  companyCondition: CompanyCondion[];

  @OneToMany(
    () => TodoAppUser,
    (todoappuser) => todoappuser.user
  )
  todoAppUsers: TodoAppUser[];

  @ManyToMany(
    () => ChatTool,
    (chattool) => chattool.users
  )
  @JoinTable({
    name: "chat_tool_users",
    joinColumn: { name: "user_id" },
    inverseJoinColumn: { name: "id" },
  })
  chattools: ChatTool[];

  @OneToOne(
    () => Section,
    (section) => section.boardAdminUser
  )
  @JoinColumn({ name: "id", referencedColumnName: "board_admin_user_id" })
  section: Section;

  @ManyToOne(
    () => Company,
    (company) => company.users
  )
  @JoinColumn({ name: "company_id" })
  company: Company;
}
