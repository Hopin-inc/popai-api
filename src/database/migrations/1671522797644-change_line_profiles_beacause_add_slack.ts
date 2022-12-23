import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeLineProfilesBeacauseAddSlack1671522797644 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE line_profiles
          ADD COLUMN chat_tool_id INT NULL AFTER line_id `,
    );
    await queryRunner.query(
      `ALTER TABLE line_profiles
          ADD CONSTRAINT chat_tool_id_index FOREIGN KEY (chat_tool_id) REFERENCES m_chat_tools (id) ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE line_profiles DROP FOREIGN KEY chat_tool_id_index`);
    await queryRunner.query(`ALTER TABLE line_profiles DROP COLUMN chat_tool_id`);
  }
}
