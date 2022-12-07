import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIsDemoToCompanies1669686584736 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE companies ADD COLUMN is_demo TINYINT(1) DEFAULT 0 AFTER admin_user_id `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN is_demo`);
  }
}
