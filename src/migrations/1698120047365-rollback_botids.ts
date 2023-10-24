import { MigrationInterface, QueryRunner } from "typeorm";

export class rollbackBotids1698120047365 implements MigrationInterface {
    name = 'rollbackBotids1698120047365'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP COLUMN \`user_bot_id\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP COLUMN \`user_bot_secret\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP COLUMN \`channel_bot_secret\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` CHANGE COLUMN \`channel_bot_id\` \`bot_id\` varchar(50) NULL`);
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP FOREIGN KEY `FK_64e0b06ca3acaa5a05f3e96c7fb`");
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD CONSTRAINT \`FK_64e0b06ca3acaa5a05f3e96c7fb\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP FOREIGN KEY \`FK_64e0b06ca3acaa5a05f3e96c7fb\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP COLUMN \`bot_id\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD \`channel_bot_secret\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` CHANGE COLUMN \`bot_id\` \`channel_bot_id\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD \`user_bot_secret\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD \`user_bot_id\` varchar(50) NULL`);
    }

}
