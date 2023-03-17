import { MigrationInterface, QueryRunner } from "typeorm";

export class addInstallationInIct1678944124625 implements MigrationInterface {
    name = 'addInstallationInIct1678944124625'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_392dab9b1e396a8b68faf36227\` ON \`t_line_message_queues\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP COLUMN \`registered_app_user_id\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD \`installation\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP COLUMN \`installation\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD \`registered_app_user_id\` varchar(12) NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_392dab9b1e396a8b68faf36227\` ON \`t_line_message_queues\` (\`message_id\`)`);
    }

}
