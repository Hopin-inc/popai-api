import { MigrationInterface, QueryRunner } from "typeorm";

export class addEmailVerification1680530600728 implements MigrationInterface {
    name = 'addEmailVerification1680530600728'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_accounts\` ADD \`email_verified\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_accounts\` DROP COLUMN \`email_verified\``);
    }

}
