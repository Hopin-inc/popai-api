import { MigrationInterface, QueryRunner } from 'typeorm';

export class addUniqueChatToolUsers1668138967746 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE chat_tool_users ADD CONSTRAINT chat_tool_users_user_id_chattool_id_index UNIQUE (user_id,chattool_id)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE chat_tool_users DROP FOREIGN KEY chat_tool_users_ibfk_1 `);
    await queryRunner.query(`ALTER TABLE chat_tool_users DROP FOREIGN KEY chat_tool_users_ibfk_2 `);
    await queryRunner.query(
      `  ALTER TABLE chat_tool_users DROP INDEX chat_tool_users_user_id_chattool_id_index`
    );
    await queryRunner.query(
      `ALTER TABLE chat_tool_users ADD FOREIGN KEY (user_id) REFERENCES users (id)  ON DELETE SET NULL`
    );
    await queryRunner.query(
      `ALTER TABLE chat_tool_users ADD FOREIGN KEY (chattool_id) REFERENCES m_chat_tools (id)  ON DELETE SET NULL`
    );
  }
}
