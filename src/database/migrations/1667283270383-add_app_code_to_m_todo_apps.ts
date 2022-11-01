import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAppCodeToMTodoApps1667283270383 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_todo_apps ADD todo_app_code VARCHAR(40) NULL AFTER name`
    );

    await queryRunner.query(`
        ALTER TABLE m_todo_apps ADD UNIQUE todo_app_code_index (todo_app_code)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE m_todo_apps DROP COLUMN todo_app_code`);
  }
}
