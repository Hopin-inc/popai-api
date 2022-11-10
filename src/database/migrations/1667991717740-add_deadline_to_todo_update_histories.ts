import { MigrationInterface, QueryRunner } from 'typeorm';

export class addDeadlineToTodoUpdateHistories1667991717740 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todo_update_histories 
      ADD COLUMN deadline_before DATETIME NULL AFTER todo_id,
      ADD COLUMN deadline_after DATETIME NULL AFTER deadline_before,
      ADD COLUMN is_done BOOLEAN AFTER deadline_after
      `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todo_update_histories 
        DROP COLUMN deadline_before ,
        DROP COLUMN deadline_after ,
        DROP COLUMN is_done 
        `
    );
  }
}
