import { MigrationInterface, QueryRunner } from 'typeorm';

export class addSectionToColumnName1670545663560 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE column_name
        ADD COLUMN section VARCHAR(255) NULL AFTER todo;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE column_name DROP COLUMN section;`);
  }
}
