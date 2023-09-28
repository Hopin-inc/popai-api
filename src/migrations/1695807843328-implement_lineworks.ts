import { MigrationInterface, QueryRunner } from "typeorm";

export class implementLineworks1695807843328 implements MigrationInterface {
  columns = "implementLineworks1695807843328";
  
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` CHANGE `access_token` `access_token` TEXT CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NULL DEFAULT NULL");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `refresh_token` TEXT NULL AFTER `installation`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `client_id` VARCHAR(50) NULL AFTER `refresh_token`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `client_secret` VARCHAR(50) NULL AFTER `client_id`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `service_account` VARCHAR(50) NULL AFTER `client_secret`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `secret_key` TEXT NULL AFTER `service_account`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `bot_secret` TEXT NULL AFTER `secret_key`");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` CHANGE `access_token` `access_token` VARCHAR(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NULL DEFAULT NULL");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `refresh_token`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `client_id`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `client_secret`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `service_account`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `secret_key`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `bot_secret`");
  }
}
