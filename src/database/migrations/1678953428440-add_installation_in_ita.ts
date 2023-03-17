import { MigrationInterface, QueryRunner } from "typeorm";

export class addInstallationInIta1678953428440 implements MigrationInterface {
    name = 'addInstallationInIta1678953428440'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP COLUMN \`auth_key\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD \`access_token\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD \`app_workspace_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD \`installation\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP COLUMN \`installation\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP COLUMN \`app_workspace_id\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP COLUMN \`access_token\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD \`auth_key\` varchar(255) NULL`);
    }

}
