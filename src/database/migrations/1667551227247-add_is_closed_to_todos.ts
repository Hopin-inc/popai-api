import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIsClosedToTodos1667551227247 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todos ADD is_closed BOOLEAN DEFAULT FALSE AFTER is_rescheduled`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos DROP COLUMN is_closed`);
  }
}
