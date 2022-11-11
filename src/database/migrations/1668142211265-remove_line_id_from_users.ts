import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeLineIdFromUsers1668142211265 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN line_id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD line_id VARCHAR(255) NULL AFTER name`);
  }
}
