import { Column, ViewEntity } from "typeorm";
import Board from "../settings/Board";
import PropertyUsage from "../settings/PropertyUsage";
import { ProjectRule, TodoAppId, UsageType } from "../../consts/common";

@ViewEntity("v_todo_app_configs", {
  expression: dataSource => dataSource
    .createQueryBuilder()
    .select("b.id", "board_id")
    .addSelect(`
      CASE
        WHEN (
          b.todo_app_id = ${ TodoAppId.NOTION }
          AND SUM(CASE WHEN pu.usage = ${ UsageType.TITLE } THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN pu.usage = ${ UsageType.ASSIGNEE } THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN pu.usage = ${ UsageType.DEADLINE } THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN pu.usage = ${ UsageType.IS_DONE } THEN 1 ELSE 0 END) = 1
          AND (
            b.project_rule != ${ ProjectRule.PARENT_TODO }
            OR SUM(CASE WHEN pu.usage = ${ UsageType.PARENT_TODO } THEN 1 ELSE 0 END) = 1
          )
        ) OR (
          b.todo_app_id = ${ TodoAppId.BACKLOG }
          AND SUM(CASE WHEN pu.usage = ${ UsageType.IS_DONE } THEN 1 ELSE 0 END) = 1
        ) THEN TRUE
        ELSE FALSE
      END
    `, "is_valid")
    .from(Board, "b")
    .leftJoin(PropertyUsage, "pu")
    .groupBy("b.id"),
})
export default class TodoAppConfigView {
  @Column({ name: "board_id" })
  boardId: number;

  @Column({ name: "is_valid" })
  isValid: boolean;
}
