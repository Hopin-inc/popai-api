import { MigrationInterface, QueryRunner } from 'typeorm';

export class addChannelIdToSection1671695531833 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sections
          ADD COLUMN channel_id VARCHAR(255) NULL AFTER board_id`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sections DROP COLUMN channel_id`);
  }
}
