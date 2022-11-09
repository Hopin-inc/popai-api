import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPrimaryDomainToTodoAppUsers1667966522689 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todo_app_users ADD primary_domain VARCHAR(255) NULL AFTER user_app_id`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todo_app_users DROP COLUMN primary_domain`);
  }
}
