import { MigrationInterface, QueryRunner } from "typeorm";

export class setMessageTokenNullable1674108753863 implements MigrationInterface {
    name = 'setMessageTokenNullable1674108753863'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` CHANGE \`message_token\` \`message_token\` text COLLATE "utf8mb4_unicode_ci" NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` CHANGE \`message_token\` \`message_token\` text NOT NULL`);
    }

}
