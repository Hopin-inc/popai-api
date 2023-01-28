import { MigrationInterface, QueryRunner } from "typeorm";

export class fixTypoIsOpenned1674611085714 implements MigrationInterface {
    name = 'fixTypoIsOpenned1674611085714'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` RENAME COLUMN \`is_openned\` TO \`is_opened\``);
        await queryRunner.query(`ALTER TABLE \`sections\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`sections\` ADD \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`sections\` ADD \`deleted_at\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD \`deleted_at\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`deleted_at\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`sections\` DROP COLUMN \`deleted_at\``);
        await queryRunner.query(`ALTER TABLE \`sections\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`sections\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`messages\` RENAME COLUMN \`is_opened\` TO \`is_openned\``);
    }

}
