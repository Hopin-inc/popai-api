import { MigrationInterface, QueryRunner } from "typeorm";

export class prospectAddSlackConfigsAndComment1676552229613 implements MigrationInterface {
    name = 'prospectAddSlackConfigsAndComment1676552229613'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD \`slack_channel_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD \`slack_view_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD \`comment\` text COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD \`comment_responded_at\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP COLUMN \`comment_responded_at\``);
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP COLUMN \`comment\``);
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP COLUMN \`slack_view_id\``);
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP COLUMN \`slack_channel_id\``);
    }

}
