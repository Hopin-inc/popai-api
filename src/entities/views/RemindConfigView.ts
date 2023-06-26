import { Column, ViewEntity } from "typeorm";
import RemindConfig from "../settings/RemindConfig";

@ViewEntity("v_remind_configs", {
  expression: dataSource => dataSource
    .createQueryBuilder()
    .select("c.id", "config_id")
    .addSelect("c.type", "type")
    .addSelect("c.enabled", "enabled")
    .addSelect(`
      CASE
        WHEN
          c.chat_tool_id IS NOT NULL
          AND c.channel IS NOT NULL
          AND c.frequency IS NOT NULL
          THEN TRUE
        ELSE FALSE
      END
    `, "is_valid")
    .from(RemindConfig, "c"),
})
export default class RemindConfigView {
  @Column({ name: "config_id" })
  configId: number;

  @Column({ name: "type" })
  type: number;

  @Column({ name: "enabled" })
  enabled: boolean;

  @Column({ name: "is_valid" })
  isValid: boolean;
}
