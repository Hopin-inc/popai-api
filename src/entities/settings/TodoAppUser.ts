import { Entity, Column, PrimaryColumn, JoinColumn, OneToOne } from "typeorm";

import BaseEntity from "../BaseEntity";
import User from "./User";
import { ValueOf } from "../../types";
import { TodoAppId } from "../../consts/common";

@Entity("s_todo_app_users")
export default class TodoAppUser extends BaseEntity {
  constructor(
    user: User | string,
    todoAppId: ValueOf<typeof TodoAppId>,
    appUserId: string,
  ) {
    super();
    if (user) {
      this.userId = typeof user === "string" ? user : user.id;
      this.todoAppId = todoAppId;
      this.appUserId = appUserId;
    }
  }

  @PrimaryColumn({ name: "user_id" })
  userId: string;

  @PrimaryColumn({ name: "todo_app_id" })
  todoAppId: number;

  @Column({ name: "app_user_id", type: "varchar", length: 255 })
  appUserId: string;

  @OneToOne(
    () => User,
    user => user.todoAppUser,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "user_id" })
  user: User;
}
