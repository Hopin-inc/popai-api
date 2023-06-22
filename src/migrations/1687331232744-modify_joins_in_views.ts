import { MigrationInterface, QueryRunner } from "typeorm";

export class modifyJoinsInViews1687331232744 implements MigrationInterface {
  name = "modifyJoinsInViews1687331232744";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER VIEW \`v_user_configs\` AS SELECT \`c\`.\`id\` AS \`company_id\`, 
      CASE
        WHEN COUNT(\`u\`.\`id\`) > 0 THEN TRUE
        ELSE FALSE
      END
     AS \`is_valid\` FROM \`s_companies\` \`c\` LEFT JOIN \`s_users\` \`u\` ON  \`c\`.\`id\` = \`u\`.\`company_id\` AND \`u\`.\`deleted_at\` IS NULL WHERE \`c\`.\`deleted_at\` IS NULL GROUP BY \`c\`.\`id\``);
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
     AS \`is_valid\` FROM \`s_boards\` \`b\` LEFT JOIN \`s_property_usages\` \`pu\` ON  \`b\`.\`id\` = \`pu\`.\`board_id\` AND \`pu\`.\`deleted_at\` IS NULL WHERE ( \`pu\`.\`deleted_at\` IS NULL ) AND ( \`b\`.\`deleted_at\` IS NULL ) GROUP BY \`b\`.\`id\``);
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
    await queryRunner.query(`CREATE VIEW \`v_user_configs\` AS SELECT \`c\`.\`id\` AS \`company_id\`, 
      CASE
        WHEN COUNT(\`u\`.\`id\`) > 0 THEN TRUE
        ELSE FALSE
      END
     AS \`is_valid\` FROM \`s_companies\` \`c\` LEFT JOIN \`s_users\` \`u\` ON \`u\`.\`deleted_at\` IS NULL WHERE \`c\`.\`deleted_at\` IS NULL GROUP BY \`c\`.\`id\``);
  }

}
