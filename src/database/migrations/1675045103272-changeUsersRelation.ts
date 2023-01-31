import { MigrationInterface, QueryRunner } from "typeorm";

export class changeUsersRelation1675045103272 implements MigrationInterface {
    name = 'changeUsersRelation1675045103272'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`todo_histories\` DROP FOREIGN KEY \`FK_bc2306e4d414b4eb8234fd0ef93\``);
        await queryRunner.query(`ALTER TABLE \`todo_histories\` ADD CONSTRAINT \`FK_bc2306e4d414b4eb8234fd0ef93\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`todo_histories\` DROP FOREIGN KEY \`FK_bc2306e4d414b4eb8234fd0ef93\``);
        await queryRunner.query(`ALTER TABLE \`todo_histories\` ADD CONSTRAINT \`FK_bc2306e4d414b4eb8234fd0ef93\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

}
