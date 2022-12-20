import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIsArchiveToColumnName1671495189301 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE column_name
        ADD COLUMN is_archive VARCHAR(255) NULL AFTER is_done;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE column_name DROP COLUMN is_archive;`);
  }
}
