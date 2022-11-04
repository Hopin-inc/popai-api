import { MigrationInterface, QueryRunner } from 'typeorm';

export class addUserAppIdToTodoAppUsers1667472756966 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todo_app_users ADD user_app_id VARCHAR(255) NULL AFTER todoapp_id`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todo_app_users DROP COLUMN user_app_id`);
  }
}
