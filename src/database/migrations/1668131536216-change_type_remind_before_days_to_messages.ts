import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeTypeRemindBeforeDaysToMessages1668131536216 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE messages 
      MODIFY COLUMN remind_before_days INT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE messages 
        MODIFY COLUMN remind_before_days VARCHAR(255) NULL`
    );
  }
}
