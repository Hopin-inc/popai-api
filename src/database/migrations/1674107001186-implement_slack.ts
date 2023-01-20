import { MigrationInterface, QueryRunner } from "typeorm";

export class implementSlack1674107001186 implements MigrationInterface {
    name = 'implementSlack1674107001186'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`sections\` ADD \`channel_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD \`channel_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD \`thread_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`thread_id\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`channel_id\``);
        await queryRunner.query(`ALTER TABLE \`sections\` DROP COLUMN \`channel_id\``);
    }

}
