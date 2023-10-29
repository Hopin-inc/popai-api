import { MigrationInterface, QueryRunner } from "typeorm";

export class syncMigrations1698109962516 implements MigrationInterface {
    name = "syncMigrations1698109962516";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP VIEW `v_remind_configs`");
        await queryRunner.query(`CREATE VIEW \`v_remind_configs\` AS SELECT \`c\`.\`id\` AS \`config_id\`, \`c\`.\`type\` AS \`type\`, \`c\`.\`enabled\` AS \`enabled\`, 
      CASE
        WHEN
          \`c\`.\`chat_tool_id\` IS NOT NULL
          AND \`c\`.\`channel\` IS NOT NULL
          AND \`c\`.\`frequency\` IS NOT NULL
          THEN TRUE
        ELSE FALSE
      END
     AS \`is_valid\` FROM \`s_remind_configs\` \`c\` WHERE \`c\`.\`deleted_at\` IS NULL`);
        await queryRunner.query("INSERT INTO `typeorm_metadata`(`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, DEFAULT, ?, ?, ?)", ["angel-local","VIEW","v_remind_configs","SELECT `c`.`id` AS `config_id`, `c`.`type` AS `type`, `c`.`enabled` AS `enabled`, \n      CASE\n        WHEN\n          `c`.`chat_tool_id` IS NOT NULL\n          AND `c`.`channel` IS NOT NULL\n          AND `c`.`frequency` IS NOT NULL\n          THEN TRUE\n        ELSE FALSE\n      END\n     AS `is_valid` FROM `s_remind_configs` `c` WHERE `c`.`deleted_at` IS NULL"]);
        await queryRunner.query("DROP VIEW `v_user_configs`");
        await queryRunner.query(`CREATE VIEW \`v_user_configs\` AS SELECT \`c\`.\`id\` AS \`company_id\`, 
      CASE
        WHEN COUNT(\`u\`.\`id\`) > 0 THEN TRUE
        ELSE FALSE
      END
     AS \`is_valid\` FROM \`s_companies\` \`c\` LEFT JOIN \`s_users\` \`u\` ON  \`c\`.\`id\` = \`u\`.\`company_id\` AND \`u\`.\`deleted_at\` IS NULL WHERE \`c\`.\`deleted_at\` IS NULL GROUP BY \`c\`.\`id\``);
        await queryRunner.query("INSERT INTO `typeorm_metadata`(`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, DEFAULT, ?, ?, ?)", ["angel-local","VIEW","v_user_configs","SELECT `c`.`id` AS `company_id`, \n      CASE\n        WHEN COUNT(`u`.`id`) > 0 THEN TRUE\n        ELSE FALSE\n      END\n     AS `is_valid` FROM `s_companies` `c` LEFT JOIN `s_users` `u` ON  `c`.`id` = `u`.`company_id` AND `u`.`deleted_at` IS NULL WHERE `c`.`deleted_at` IS NULL GROUP BY `c`.`id`"]);
        await queryRunner.query("DROP VIEW `v_prospect_configs`");
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
        await queryRunner.query("INSERT INTO `typeorm_metadata`(`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, DEFAULT, ?, ?, ?)", ["angel-local","VIEW","v_prospect_configs","SELECT `c`.`id` AS `config_id`, `c`.`type` AS `type`, `c`.`enabled` AS `enabled`, \n      CASE\n        WHEN\n          `c`.`chat_tool_id` IS NOT NULL\n          AND `c`.`channel` IS NOT NULL\n          AND `c`.`from` IS NOT NULL\n          AND (\n            `c`.`from` != 2\n            OR `c`.`from_days_before` IS NOT NULL\n          )\n          AND (\n            `c`.`from` != 3\n            OR `c`.`begin_of_week` IS NOT NULL\n          )\n          AND `c`.`to` IS NOT NULL\n          AND `c`.`frequency` IS NOT NULL\n          AND (\n            `c`.`frequency` != 3\n            OR (\n              `c`.`frequency_days_before` IS NOT NULL\n              AND JSON_DEPTH(`c`.`frequency_days_before`) >= 2\n            )\n          )\n          THEN TRUE\n        ELSE FALSE\n      END\n     AS `is_valid` FROM `s_prospect_configs` `c` WHERE `c`.`deleted_at` IS NULL"]);
        await queryRunner.query("DROP VIEW `v_todo_app_configs`");
        await queryRunner.query(`CREATE VIEW \`v_todo_app_configs\` AS SELECT \`b\`.\`id\` AS \`board_id\`, 
      CASE
        WHEN (
          \`b\`.\`todo_app_id\` = 3
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 1 THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 3 THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 4 THEN 1 ELSE 0 END) = 1
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 5 THEN 1 ELSE 0 END) = 1
          AND (
            \`b\`.\`project_rule\` != 1
            OR SUM(CASE WHEN \`pu\`.\`usage\` = 7 THEN 1 ELSE 0 END) = 1
          )
        ) OR (
          \`b\`.\`todo_app_id\` = 4
          AND SUM(CASE WHEN \`pu\`.\`usage\` = 5 THEN 1 ELSE 0 END) = 1
        ) THEN TRUE
        ELSE FALSE
      END
     AS \`is_valid\` FROM \`s_boards\` \`b\` LEFT JOIN \`s_property_usages\` \`pu\` ON  \`b\`.\`id\` = \`pu\`.\`board_id\` AND \`pu\`.\`deleted_at\` IS NULL WHERE ( \`pu\`.\`deleted_at\` IS NULL ) AND ( \`b\`.\`deleted_at\` IS NULL ) GROUP BY \`b\`.\`id\``);
        await queryRunner.query("INSERT INTO `typeorm_metadata`(`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, DEFAULT, ?, ?, ?)", ["angel-local","VIEW","v_todo_app_configs","SELECT `b`.`id` AS `board_id`, \n      CASE\n        WHEN (\n          `b`.`todo_app_id` = 3\n          AND SUM(CASE WHEN `pu`.`usage` = 1 THEN 1 ELSE 0 END) = 1\n          AND SUM(CASE WHEN `pu`.`usage` = 3 THEN 1 ELSE 0 END) = 1\n          AND SUM(CASE WHEN `pu`.`usage` = 4 THEN 1 ELSE 0 END) = 1\n          AND SUM(CASE WHEN `pu`.`usage` = 5 THEN 1 ELSE 0 END) = 1\n          AND (\n            `b`.`project_rule` != 1\n            OR SUM(CASE WHEN `pu`.`usage` = 7 THEN 1 ELSE 0 END) = 1\n          )\n        ) OR (\n          `b`.`todo_app_id` = 4\n          AND SUM(CASE WHEN `pu`.`usage` = 5 THEN 1 ELSE 0 END) = 1\n        ) THEN TRUE\n        ELSE FALSE\n      END\n     AS `is_valid` FROM `s_boards` `b` LEFT JOIN `s_property_usages` `pu` ON  `b`.`id` = `pu`.`board_id` AND `pu`.`deleted_at` IS NULL WHERE ( `pu`.`deleted_at` IS NULL ) AND ( `b`.`deleted_at` IS NULL ) GROUP BY `b`.`id`"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DELETE FROM `typeorm_metadata` WHERE `type` = ? AND `name` = ? AND `schema` = ?", ["VIEW","v_todo_app_configs","angel-local"]);
        await queryRunner.query("DROP VIEW `v_todo_app_configs`");
        await queryRunner.query("DELETE FROM `typeorm_metadata` WHERE `type` = ? AND `name` = ? AND `schema` = ?", ["VIEW","v_prospect_configs","angel-local"]);
        await queryRunner.query("DROP VIEW `v_prospect_configs`");
        await queryRunner.query("DELETE FROM `typeorm_metadata` WHERE `type` = ? AND `name` = ? AND `schema` = ?", ["VIEW","v_user_configs","angel-local"]);
        await queryRunner.query("DROP VIEW `v_user_configs`");
        await queryRunner.query("DELETE FROM `typeorm_metadata` WHERE `type` = ? AND `name` = ? AND `schema` = ?", ["VIEW","v_remind_configs","angel-local"]);
        await queryRunner.query("DROP VIEW `v_remind_configs`");
    }

}
