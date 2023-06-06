import { MigrationInterface, QueryRunner } from "typeorm";

export class implementBacklog1683588413444 implements MigrationInterface {
  name = "implementBacklog1683588413444";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` ADD `refresh_token` varchar(255) NULL");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP COLUMN `refresh_token`");
  }

}
