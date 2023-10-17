import { MigrationInterface, QueryRunner } from "typeorm";

export class migrations1697526265297 implements MigrationInterface {
    name = "migrations1697526265297";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `s_setup_features` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` int NOT NULL AUTO_INCREMENT, `setup_config_id` int NOT NULL, `feature` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `s_setup_configs` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` int NOT NULL AUTO_INCREMENT, `company_id` varchar(255) NOT NULL, `current_step` int NOT NULL, `setup_todo_app_id` int NOT NULL, `setup_chat_tool_id` int NOT NULL, UNIQUE INDEX `REL_3731fe8ead37ea7fe8d9d3e734` (`company_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `s_remind_configs` DROP COLUMN `report_after_recovery`");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `user_bot_id`");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `user_bot_id` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `channel_bot_id`");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `channel_bot_id` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `s_setup_features` ADD CONSTRAINT `FK_e352f23e7620fb8eb5e31570b7f` FOREIGN KEY (`setup_config_id`) REFERENCES `s_setup_configs`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
        await queryRunner.query("ALTER TABLE `s_setup_configs` ADD CONSTRAINT `FK_3731fe8ead37ea7fe8d9d3e7344` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
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
        await queryRunner.query("INSERT INTO `angel-local`.`typeorm_metadata`(`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, DEFAULT, ?, ?, ?)", ["angel-local","VIEW","v_prospect_configs","SELECT `c`.`id` AS `config_id`, `c`.`type` AS `type`, `c`.`enabled` AS `enabled`, \n      CASE\n        WHEN\n          `c`.`chat_tool_id` IS NOT NULL\n          AND `c`.`channel` IS NOT NULL\n          AND `c`.`from` IS NOT NULL\n          AND (\n            `c`.`from` != 2\n            OR `c`.`from_days_before` IS NOT NULL\n          )\n          AND (\n            `c`.`from` != 3\n            OR `c`.`begin_of_week` IS NOT NULL\n          )\n          AND `c`.`to` IS NOT NULL\n          AND `c`.`frequency` IS NOT NULL\n          AND (\n            `c`.`frequency` != 3\n            OR (\n              `c`.`frequency_days_before` IS NOT NULL\n              AND JSON_DEPTH(`c`.`frequency_days_before`) >= 2\n            )\n          )\n          THEN TRUE\n        ELSE FALSE\n      END\n     AS `is_valid` FROM `s_prospect_configs` `c` WHERE `c`.`deleted_at` IS NULL"]);
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
        await queryRunner.query("INSERT INTO `angel-local`.`typeorm_metadata`(`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, DEFAULT, ?, ?, ?)", ["angel-local","VIEW","v_todo_app_configs","SELECT `b`.`id` AS `board_id`, \n      CASE\n        WHEN (\n          `b`.`todo_app_id` = 3\n          AND SUM(CASE WHEN `pu`.`usage` = 1 THEN 1 ELSE 0 END) = 1\n          AND SUM(CASE WHEN `pu`.`usage` = 3 THEN 1 ELSE 0 END) = 1\n          AND SUM(CASE WHEN `pu`.`usage` = 4 THEN 1 ELSE 0 END) = 1\n          AND SUM(CASE WHEN `pu`.`usage` = 5 THEN 1 ELSE 0 END) = 1\n          AND (\n            `b`.`project_rule` != 1\n            OR SUM(CASE WHEN `pu`.`usage` = 7 THEN 1 ELSE 0 END) = 1\n          )\n        ) OR (\n          `b`.`todo_app_id` = 4\n          AND SUM(CASE WHEN `pu`.`usage` = 5 THEN 1 ELSE 0 END) = 1\n        ) THEN TRUE\n        ELSE FALSE\n      END\n     AS `is_valid` FROM `s_boards` `b` LEFT JOIN `s_property_usages` `pu` ON  `b`.`id` = `pu`.`board_id` AND `pu`.`deleted_at` IS NULL WHERE ( `pu`.`deleted_at` IS NULL ) AND ( `b`.`deleted_at` IS NULL ) GROUP BY `b`.`id`"]);
        await queryRunner.query("DROP VIEW `v_user_configs`");
        await queryRunner.query(`CREATE VIEW \`v_user_configs\` AS SELECT \`c\`.\`id\` AS \`company_id\`, 
      CASE
        WHEN COUNT(\`u\`.\`id\`) > 0 THEN TRUE
        ELSE FALSE
      END
     AS \`is_valid\` FROM \`s_companies\` \`c\` LEFT JOIN \`s_users\` \`u\` ON  \`c\`.\`id\` = \`u\`.\`company_id\` AND \`u\`.\`deleted_at\` IS NULL WHERE \`c\`.\`deleted_at\` IS NULL GROUP BY \`c\`.\`id\``);
        await queryRunner.query("INSERT INTO `angel-local`.`typeorm_metadata`(`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, DEFAULT, ?, ?, ?)", ["angel-local","VIEW","v_user_configs","SELECT `c`.`id` AS `company_id`, \n      CASE\n        WHEN COUNT(`u`.`id`) > 0 THEN TRUE\n        ELSE FALSE\n      END\n     AS `is_valid` FROM `s_companies` `c` LEFT JOIN `s_users` `u` ON  `c`.`id` = `u`.`company_id` AND `u`.`deleted_at` IS NULL WHERE `c`.`deleted_at` IS NULL GROUP BY `c`.`id`"]);
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
        await queryRunner.query("INSERT INTO `angel-local`.`typeorm_metadata`(`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, DEFAULT, ?, ?, ?)", ["angel-local","VIEW","v_remind_configs","SELECT `c`.`id` AS `config_id`, `c`.`type` AS `type`, `c`.`enabled` AS `enabled`, \n      CASE\n        WHEN\n          `c`.`chat_tool_id` IS NOT NULL\n          AND `c`.`channel` IS NOT NULL\n          AND `c`.`frequency` IS NOT NULL\n          THEN TRUE\n        ELSE FALSE\n      END\n     AS `is_valid` FROM `s_remind_configs` `c` WHERE `c`.`deleted_at` IS NULL"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DELETE FROM `angel-local`.`typeorm_metadata` WHERE `type` = ? AND `name` = ? AND `schema` = ?", ["VIEW","v_remind_configs","angel-local"]);
        await queryRunner.query("DROP VIEW `v_remind_configs`");
        await queryRunner.query("DELETE FROM `angel-local`.`typeorm_metadata` WHERE `type` = ? AND `name` = ? AND `schema` = ?", ["VIEW","v_user_configs","angel-local"]);
        await queryRunner.query("DROP VIEW `v_user_configs`");
        await queryRunner.query("DELETE FROM `angel-local`.`typeorm_metadata` WHERE `type` = ? AND `name` = ? AND `schema` = ?", ["VIEW","v_todo_app_configs","angel-local"]);
        await queryRunner.query("DROP VIEW `v_todo_app_configs`");
        await queryRunner.query("DELETE FROM `angel-local`.`typeorm_metadata` WHERE `type` = ? AND `name` = ? AND `schema` = ?", ["VIEW","v_prospect_configs","angel-local"]);
        await queryRunner.query("DROP VIEW `v_prospect_configs`");
        await queryRunner.query("ALTER TABLE `s_setup_configs` DROP FOREIGN KEY `FK_3731fe8ead37ea7fe8d9d3e7344`");
        await queryRunner.query("ALTER TABLE `s_setup_features` DROP FOREIGN KEY `FK_e352f23e7620fb8eb5e31570b7f`");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `channel_bot_id`");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `channel_bot_id` varchar(50) NULL");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `user_bot_id`");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `user_bot_id` varchar(50) NULL");
        await queryRunner.query("ALTER TABLE `s_remind_configs` ADD `report_after_recovery` tinyint NULL DEFAULT '0'");
        await queryRunner.query("DROP INDEX `REL_3731fe8ead37ea7fe8d9d3e734` ON `s_setup_configs`");
        await queryRunner.query("DROP TABLE `s_setup_configs`");
        await queryRunner.query("DROP TABLE `s_setup_features`");
    }

}
