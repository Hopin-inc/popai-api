import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeCompanyBoardsToSections1667556980443 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`RENAME TABLE company_boards TO sections`);
    await queryRunner.query(`ALTER TABLE sections ADD name VARCHAR(255) NULL AFTER id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sections DROP COLUMN name`);
    await queryRunner.query(`RENAME TABLE sections TO company_boards`);
  }
}
