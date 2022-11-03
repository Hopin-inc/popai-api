import { MigrationInterface, QueryRunner } from 'typeorm';

export class addRemindedCountTodoTalbe1667459456071 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos ADD reminded_count INT NULL AFTER is_rescheduled`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos DROP COLUMN reminded_count`);
  }
}
