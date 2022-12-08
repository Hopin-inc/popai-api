import { MigrationInterface, QueryRunner } from 'typeorm';

export class addCreatedAtDeletedAtTodoUsers1670076875440 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todo_users ADD COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
             ADD COLUMN deleted_at DATETIME NULL `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todo_users 
           DROP COLUMN created_at ,
           DROP COLUMN deleted_at 
       `
    );
  }
}
