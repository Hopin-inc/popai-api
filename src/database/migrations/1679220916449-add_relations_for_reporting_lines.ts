import { MigrationInterface, QueryRunner } from "typeorm";

export class addRelationsForReportingLines1679220916449 implements MigrationInterface {
    name = 'addRelationsForReportingLines1679220916449'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_reporting_lines\` ADD CONSTRAINT \`FK_2eedaea8c1d677223edeee6ad85\` FOREIGN KEY (\`superior_user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_reporting_lines\` ADD CONSTRAINT \`FK_b91d62969adefcfd5a08934e007\` FOREIGN KEY (\`subordinate_user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_reporting_lines\` DROP FOREIGN KEY \`FK_b91d62969adefcfd5a08934e007\``);
        await queryRunner.query(`ALTER TABLE \`s_reporting_lines\` DROP FOREIGN KEY \`FK_2eedaea8c1d677223edeee6ad85\``);
    }

}
