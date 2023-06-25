import { MigrationInterface, QueryRunner } from "typeorm";

export class implementRemind1687505535514 implements MigrationInterface {
  name = "implementRemind1687505535514";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE `t_reminds` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` varchar(36) NOT NULL, `user_id` varchar(255) NOT NULL, `company_id` varchar(255) NOT NULL, `todo_id` varchar(255) NULL, `project_id` varchar(255) NULL, `chat_tool_id` int NULL, `app_channel_id` varchar(255) NULL, `app_thread_id` varchar(255) NULL, INDEX `IDX_8e4dbc1601a266876646214225` (`app_channel_id`), INDEX `IDX_75d3d315050ad6e683b2358e6f` (`app_thread_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    await queryRunner.query("CREATE TABLE `s_remind_timings` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` int NOT NULL AUTO_INCREMENT, `config_id` int NOT NULL, `time` time NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
    await queryRunner.query("CREATE TABLE `s_remind_configs` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` int NOT NULL AUTO_INCREMENT, `company_id` varchar(255) NOT NULL, `type` int NOT NULL DEFAULT '2', `enabled` tinyint NOT NULL DEFAULT 0, `chat_tool_id` int NULL, `channel` varchar(255) NULL, `frequency` tinyint NULL, `limit` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
    await queryRunner.query("ALTER TABLE `t_reminds` ADD CONSTRAINT `FK_2598a3630bea96f1bfd548eef5d` FOREIGN KEY (`user_id`) REFERENCES `s_users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_reminds` ADD CONSTRAINT `FK_82668678031400bed6e2d9fcd61` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_reminds` ADD CONSTRAINT `FK_20eceb01f03c363448524844532` FOREIGN KEY (`todo_id`) REFERENCES `t_todos`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_reminds` ADD CONSTRAINT `FK_1e90c21721c4d9cb62f6ba5309c` FOREIGN KEY (`project_id`) REFERENCES `t_projects`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `s_remind_timings` ADD CONSTRAINT `FK_6465073ab1f1c778635a074508e` FOREIGN KEY (`config_id`) REFERENCES `s_remind_configs`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `s_remind_configs` ADD CONSTRAINT `FK_42300a85a0a3b9ade490be6a4a7` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP VIEW `v_remind_configs`");
    await queryRunner.query("ALTER TABLE `s_remind_configs` DROP FOREIGN KEY `FK_42300a85a0a3b9ade490be6a4a7`");
    await queryRunner.query("ALTER TABLE `s_remind_timings` DROP FOREIGN KEY `FK_6465073ab1f1c778635a074508e`");
    await queryRunner.query("ALTER TABLE `t_reminds` DROP FOREIGN KEY `FK_1e90c21721c4d9cb62f6ba5309c`");
    await queryRunner.query("ALTER TABLE `t_reminds` DROP FOREIGN KEY `FK_20eceb01f03c363448524844532`");
    await queryRunner.query("ALTER TABLE `t_reminds` DROP FOREIGN KEY `FK_82668678031400bed6e2d9fcd61`");
    await queryRunner.query("ALTER TABLE `t_reminds` DROP FOREIGN KEY `FK_2598a3630bea96f1bfd548eef5d`");
    await queryRunner.query("DROP TABLE `s_remind_configs`");
    await queryRunner.query("DROP TABLE `s_remind_timings`");
    await queryRunner.query("DROP INDEX `IDX_75d3d315050ad6e683b2358e6f` ON `t_reminds`");
    await queryRunner.query("DROP INDEX `IDX_8e4dbc1601a266876646214225` ON `t_reminds`");
    await queryRunner.query("DROP TABLE `t_reminds`");
  }

}
