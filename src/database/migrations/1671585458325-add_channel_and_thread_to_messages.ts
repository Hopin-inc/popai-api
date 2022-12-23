import { MigrationInterface, QueryRunner } from 'typeorm';

export class addChannelAndThreadToMessages1671585458325 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE messages
          ADD COLUMN channel_id VARCHAR(255) NULL AFTER chattool_id`,
    );

    await queryRunner.query(
      `ALTER TABLE messages
          ADD COLUMN thread_id VARCHAR(255) NULL AFTER chattool_id`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE messages DROP COLUMN channel_id`);
    await queryRunner.query(`ALTER TABLE messages DROP COLUMN thread_id`);
  }
}