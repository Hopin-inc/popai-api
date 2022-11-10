import { MigrationInterface, QueryRunner } from 'typeorm';

export class addToolCodeToMChatToolsTable1668047661944 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE m_chat_tools ADD tool_code VARCHAR(25) NULL AFTER id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE m_chat_tools DROP COLUMN tool_code`);
  }
}
