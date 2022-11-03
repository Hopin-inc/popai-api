import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAdminUserIdToCompany1667461534413 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE companies ADD admin_user_id VARCHAR(255) NULL AFTER name`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN admin_user_id`);
  }
}
