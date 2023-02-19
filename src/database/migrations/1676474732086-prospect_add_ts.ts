import { MigrationInterface, QueryRunner } from "typeorm";

export class prospectAddTs1676474732086 implements MigrationInterface {
    name = 'prospectAddTs1676474732086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD \`slack_ts\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP COLUMN \`slack_ts\``);
    }

}
