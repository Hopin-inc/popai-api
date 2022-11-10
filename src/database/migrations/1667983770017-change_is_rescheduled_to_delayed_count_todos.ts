import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeIsRescheduledToDelayedCountTodos1667983770017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos DROP COLUMN is_rescheduled`);
    await queryRunner.query(`ALTER TABLE todos ADD delayed_count INT DEFAULT 0 AFTER is_closed`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos ADD is_rescheduled BOOLEAN AFTER is_reminded`);
    await queryRunner.query(`ALTER TABLE todos DROP COLUMN delayed_count`);
  }
}
