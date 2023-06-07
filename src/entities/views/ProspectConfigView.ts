import { Column, ViewEntity } from "typeorm";
import ProspectConfig from "../settings/ProspectConfig";
import { ProspectTargetFrequency, ProspectTargetFrom } from "../../consts/scheduler";

@ViewEntity("v_prospect_configs", {
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
          AND c.from IS NOT NULL
          AND (
            c.from != ${ ProspectTargetFrom.DAYS_BEFORE_DDL }
            OR c.from_days_before IS NOT NULL
          )
          AND (
            c.from != ${ ProspectTargetFrom.START_OF_WEEK }
            OR c.begin_of_week IS NOT NULL
          )
          AND c.to IS NOT NULL
          AND c.frequency IS NOT NULL
          AND (
            c.frequency != ${ ProspectTargetFrequency.DAYS_BEFORE_DDL }
            OR (
              c.frequency_days_before IS NOT NULL
              AND JSON_DEPTH(c.frequency_days_before) >= 2
            )
          )
          THEN TRUE
        ELSE FALSE
      END
    `, "is_valid")
    .from(ProspectConfig, "c"),
})
export default class ProspectConfigView {
  @Column({ name: "config_id" })
  configId: number;

  @Column({ name: "type" })
  type: number;

  @Column({ name: "enabled" })
  enabled: boolean;

  @Column({ name: "is_valid" })
  isValid: boolean;
}
