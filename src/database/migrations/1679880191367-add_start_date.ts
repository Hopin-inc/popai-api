import { MigrationInterface, QueryRunner } from "typeorm";

export class addStartDate1679880191367 implements MigrationInterface {
    name = 'addStartDate1679880191367'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`t_todos\` ADD \`start_date\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`t_todos\` DROP COLUMN \`start_date\``);
    }

}
