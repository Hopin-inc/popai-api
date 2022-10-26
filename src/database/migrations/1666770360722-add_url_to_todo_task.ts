import { MigrationInterface, QueryRunner } from 'typeorm';

export class addUrlToTodoTask1666770360722 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todos ADD todoapp_reg_url VARCHAR(255) NULL AFTER todoapp_reg_id`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos DROP COLUMN todoapp_reg_url`);
  }
}
