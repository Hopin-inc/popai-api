import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPrimaryDomainToTodoAppUsers1667966522689 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE implemented_todo_apps ADD primary_domain VARCHAR(255) NULL AFTER auth_key`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE implemented_todo_apps DROP COLUMN primary_domain`);
  }
}
