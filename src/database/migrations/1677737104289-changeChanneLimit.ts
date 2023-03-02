import { MigrationInterface, QueryRunner } from "typeorm";

export class changeChanneLimit1677737104289 implements MigrationInterface {
    name = 'changeChanneLimit1677737104289'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` DROP COLUMN \`channel\``);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` ADD \`channel\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` DROP COLUMN \`channel\``);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` ADD \`channel\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` DROP COLUMN \`channel\``);
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` ADD \`channel\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` DROP COLUMN \`channel\``);
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` ADD \`channel\` varchar(12) NULL`);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` DROP COLUMN \`channel\``);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` ADD \`channel\` varchar(12) NULL`);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` DROP COLUMN \`channel\``);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` ADD \`channel\` varchar(12) NULL`);
    }

}
