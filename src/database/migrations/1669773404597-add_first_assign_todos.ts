import { MigrationInterface, QueryRunner } from 'typeorm';

export class addFirstAssignTodos1669773404597 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todos ADD COLUMN first_ddl_set_at DATETIME NULL,
       ADD COLUMN first_assigned_at DATETIME NULL `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todos 
         DROP COLUMN first_ddl_set_at ,
         DROP COLUMN first_assigned_at 
     `
    );
  }
}
