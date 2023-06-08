import { MigrationInterface, QueryRunner } from "typeorm";

export class addViewsForConfigStatus1686101296082 implements MigrationInterface {
  name = "addViewsForConfigStatus1686101296082";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE VIEW \`v_prospect_configs\` AS SELECT \`c\`.\`id\` AS \`config_id\`, \`c\`.\`type\` AS \`type\`, \`c\`.\`enabled\` AS \`enabled\`, 
      CASE
        WHEN
          \`c\`.\`chat_tool_id\` IS NOT NULL
          AND \`c\`.\`channel\` IS NOT NULL
          AND \`c\`.\`from\` IS NOT NULL
          AND (
            \`c\`.\`from\` != 2
            OR \`c\`.\`from_days_before\` IS NOT NULL
          )
          AND (
            \`c\`.\`from\` != 3
            OR \`c\`.\`begin_of_week\` IS NOT NULL
          )
          AND \`c\`.\`to\` IS NOT NULL
          AND \`c\`.\`frequency\` IS NOT NULL
          AND (
            \`c\`.\`frequency\` != 3
            OR (
              \`c\`.\`frequency_days_before\` IS NOT NULL
              AND JSON_DEPTH(\`c\`.\`frequency_days_before\`) >= 2
            )
          )
          THEN TRUE
        ELSE FALSE
      END
     AS \`is_valid\` FROM \`s_prospect_configs\` \`c\` WHERE \`c\`.\`deleted_at\` IS NULL`);
    await queryRunner.query(`CREATE VIEW \`v_todo_app_configs\` AS SELECT \`b\`.\`id\` AS \`board_id\`, 
      CASE
        WHEN (
          \`b\`.\`todo_app_id\` = 3
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 1 THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 3 THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 4 THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 5 THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 6 THEN 1 ELSE 0 END) = 1
          AND (
            \`b\`.\`project_rule\` != 1
            OR SUM(CASE WHEN \`pu\`.\`usage\` = 7 THEN 1 ELSE 0 END) = 1
          )
        ) OR (
          \`b\`.\`todo_app_id\` = 4
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 5 THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 6 THEN 1 ELSE 0 END) = 1
        ) THEN TRUE
        ELSE FALSE
      END
     AS \`is_valid\` FROM \`s_boards\` \`b\` LEFT JOIN \`s_property_usages\` \`pu\` ON \`pu\`.\`deleted_at\` IS NULL WHERE \`b\`.\`deleted_at\` IS NULL GROUP BY \`b\`.\`id\``);
    await queryRunner.query(`CREATE VIEW \`v_user_configs\` AS SELECT \`c\`.\`id\` AS \`company_id\`, 
      CASE
        WHEN COUNT(\`u\`.\`id\`) > 0 THEN TRUE
        ELSE FALSE
      END
     AS \`is_valid\` FROM \`s_companies\` \`c\` LEFT JOIN \`s_users\` \`u\` ON \`u\`.\`deleted_at\` IS NULL WHERE \`c\`.\`deleted_at\` IS NULL GROUP BY \`c\`.\`id\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP VIEW `v_user_configs`");
    await queryRunner.query("DROP VIEW `v_todo_app_configs`");
    await queryRunner.query("DROP VIEW `v_prospect_configs`");
  }

}
