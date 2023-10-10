import { MigrationInterface, QueryRunner } from "typeorm";

export class addReportAfterRecoveryColumns1696921571869 implements MigrationInterface {
    columns = "addReportAfterRecoveryColumns1696921571869";
    
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `s_remind_configs` ADD `report_after_recovery` tinyint NULL DEFAULT 0");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `s_remind_configs` DROP COLUMN `report_after_recovery`");
    }
}
