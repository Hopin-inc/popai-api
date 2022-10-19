import { MigrationInterface, QueryRunner } from 'typeorm';

export class chatToolUsers1666173224692 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE TABLE chat_tool_users (
      id INT NOT NULL AUTO_INCREMENT,
      auth_key VARCHAR(255) NULL,
      user_id INT NULL,
      chattool_id INT NULL,
      PRIMARY KEY(id),
      
      FOREIGN KEY (user_id) REFERENCES users (id)  ON DELETE SET NULL,
      FOREIGN KEY (chattool_id) REFERENCES m_chat_tools (id)  ON DELETE SET NULL
    );
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('chat_tool_users');
  }
}
