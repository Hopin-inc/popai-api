import { MigrationInterface, QueryRunner } from "typeorm";

export class addProfileInfo1676881676021 implements MigrationInterface {
    name = 'addProfileInfo1676881676021'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`todo_app_users\` ADD \`user_app_name\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_app_users\` ADD \`avatar\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_app_users\`
            ADD \`email\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`todo_app_users\` DROP COLUMN \`email\``);
        await queryRunner.query(`ALTER TABLE \`todo_app_users\` DROP COLUMN \`avatar\``);
        await queryRunner.query(`ALTER TABLE \`todo_app_users\` DROP COLUMN \`user_app_name\``);
    }

}
