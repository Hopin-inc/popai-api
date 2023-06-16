import { MigrationInterface, QueryRunner } from "typeorm";

export class addCommentForBacklog1686725889924 implements MigrationInterface {
  name = "addCommentForBacklog1686725889924";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `t_prospects` ADD `app_comment_id` varchar(255) NULL");
    await queryRunner.query("CREATE INDEX `IDX_713ff7f6a228f998f13679866f` ON `t_prospects` (`app_comment_id`)");
    await queryRunner.query(`ALTER VIEW \`v_todo_app_configs\` AS SELECT \`b\`.\`id\` AS \`board_id\`, 
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
     AS \`is_valid\` FROM \`s_boards\` \`b\` LEFT JOIN \`s_property_usages\` \`pu\` ON \`pu\`.\`deleted_at\` IS NULL WHERE \`b\`.\`deleted_at\` IS NULL GROUP BY \`b\`.\`id\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER VIEW \`v_todo_app_configs\` AS SELECT \`b\`.\`id\` AS \`board_id\`, 
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
    await queryRunner.query("DROP INDEX `IDX_713ff7f6a228f998f13679866f` ON `t_prospects`");
    await queryRunner.query("ALTER TABLE `t_prospects` DROP COLUMN `app_comment_id`");
  }

}
