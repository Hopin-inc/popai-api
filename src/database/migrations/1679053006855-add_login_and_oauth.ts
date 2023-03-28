import { MigrationInterface, QueryRunner } from "typeorm";

export class addLoginAndOauth1679053006855 implements MigrationInterface {
    name = 'addLoginAndOauth1679053006855'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_392dab9b1e396a8b68faf36227\` ON \`t_line_message_queues\``);
        await queryRunner.query(`CREATE TABLE \`t_sessions\` (\`id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`expired_at\` bigint NOT NULL, \`json\` text NOT NULL, \`destroyed_at\` datetime(6) NULL, INDEX \`IDX_67fa4b92e3078feb4400ab9a4f\` (\`expired_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP COLUMN \`auth_key\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD \`access_token\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD \`app_workspace_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD \`installation\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD \`app_team_id\` varchar(12) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD \`access_token\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD \`installation\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP COLUMN \`installation\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP COLUMN \`access_token\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP COLUMN \`app_team_id\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP COLUMN \`installation\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP COLUMN \`app_workspace_id\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP COLUMN \`access_token\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD \`auth_key\` varchar(255) NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_67fa4b92e3078feb4400ab9a4f\` ON \`t_sessions\``);
        await queryRunner.query(`DROP TABLE \`t_sessions\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_392dab9b1e396a8b68faf36227\` ON \`t_line_message_queues\` (\`message_id\`)`);
    }

}
