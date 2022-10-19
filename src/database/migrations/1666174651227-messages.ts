import { MigrationInterface, QueryRunner } from 'typeorm';

export class messages1666174651227 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE messages (
          id INT NOT NULL AUTO_INCREMENT,
          parent_message_id INT NULL,
          message_type_id INT NULL,
          message_trigger_id INT NULL,
          is_from_user BOOLEAN,
          user_id INT NULL,
          chattool_id INT NULL,
          message_token TEXT NULL,
          send_at DATETIME,
          todo_id INT NULL,
          is_openned BOOLEAN,
          is_replied BOOLEAN,
          reply_content_type_id INT NULL,
          body TEXT NULL,
          PRIMARY KEY(id),

          FOREIGN KEY (message_type_id) REFERENCES m_message_types (id)  ON DELETE SET NULL,
          FOREIGN KEY (message_trigger_id) REFERENCES m_message_triggers (id)  ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)  ON DELETE SET NULL,
          FOREIGN KEY (chattool_id) REFERENCES m_chat_tools (id)  ON DELETE SET NULL,
          FOREIGN KEY (todo_id) REFERENCES todos (id)  ON DELETE SET NULL,
          FOREIGN KEY (reply_content_type_id) REFERENCES m_reply_content_types (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages');
  }
}
