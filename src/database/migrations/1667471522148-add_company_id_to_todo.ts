import { MigrationInterface, QueryRunner } from 'typeorm';

export class addCompanyIdToTodo1667471522148 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todos ADD company_id INT NULL AFTER todoapp_reg_created_at`
    );

    await queryRunner.query(
      `ALTER TABLE todos ADD CONSTRAINT company_id_index FOREIGN KEY (company_id) REFERENCES companies (id)  ON DELETE SET NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos DROP FOREIGN KEY company_id_index`);
    await queryRunner.query(`ALTER TABLE todos DROP COLUMN company_id`);
  }
}
