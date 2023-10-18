import { MigrationInterface, QueryRunner } from "typeorm";

export class addBotIDColumns1696919962063 implements MigrationInterface {
	columns = "addBotIDColumns1696919962063";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `bot_secret`");
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `user_bot_id` VARCHAR(50) NULL AFTER `secret_key`");
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `user_bot_secret` TEXT NULL AFTER `user_bot_id`");
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `channel_bot_id` VARCHAR(50) NULL AFTER `user_bot_secret`");
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `channel_bot_secret` TEXT NULL AFTER `channel_bot_id`");
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD `bot_secret` TEXT NULL AFTER `secret_key`");
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `user_bot_id`");
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `user_bot_secret`");
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `channel_bot_id`");
		await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP COLUMN `channel_bot_secret`");
	}
}
