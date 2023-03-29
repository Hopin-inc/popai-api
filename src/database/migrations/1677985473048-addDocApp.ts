import { MigrationInterface, QueryRunner } from "typeorm";

export class addDocApp1677985473048 implements MigrationInterface {
    name = 'addDocApp1677985473048'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`daily_reports\` ADD \`doc_app_reg_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`daily_reports\` ADD \`doc_app_reg_url\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`line_profiles\` ADD \`user_id\` int NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`line_profiles\` DROP COLUMN \`user_id\``);
        await queryRunner.query(`ALTER TABLE \`daily_reports\` DROP COLUMN \`doc_app_reg_url\``);
        await queryRunner.query(`ALTER TABLE \`daily_reports\` DROP COLUMN \`doc_app_reg_id\``);
    }

}
