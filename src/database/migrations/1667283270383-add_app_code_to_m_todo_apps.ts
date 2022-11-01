import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAppCodeToMTodoApps1667283270383 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE m_todo_apps ADD app_code VARCHAR(40) NULL AFTER name`);

    await queryRunner.query(`
        ALTER TABLE m_todo_apps ADD UNIQUE app_code_index (app_code)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE m_todo_apps DROP COLUMN app_code`);
  }
}
