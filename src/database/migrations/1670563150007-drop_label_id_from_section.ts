import { MigrationInterface, QueryRunner } from 'typeorm';

export class dropLabelIdFromSection1670563150007 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sections DROP COLUMN label_id;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sections
        ADD COLUMN label_id VARCHAR(255) NULL;`);
  }
}
