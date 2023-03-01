import { MigrationInterface, QueryRunner } from "typeorm";

export class addEditedBy1676865203935 implements MigrationInterface {
  name = "addEditedBy1676865203935";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`todo_histories\`
        ADD \`edited_by\` int NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`todo_histories\` DROP COLUMN \`edited_by\``);
  }

}
