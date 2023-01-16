import { MigrationInterface, QueryRunner } from 'typeorm';

export class dropNotionLabelIdFromSection1670500929153 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sections DROP COLUMN notion_label_id;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sections
        ADD COLUMN notion_label_id VARCHAR(255) NULL AFTER board_id;`);
  }
}
