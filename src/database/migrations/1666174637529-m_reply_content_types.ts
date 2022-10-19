import { MigrationInterface, QueryRunner } from 'typeorm';

export class mReplyContentTypes1666174637529 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE m_reply_content_types (
          id INT NOT NULL AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          message_type_id INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
          deleted_at DATETIME,
          PRIMARY KEY(id),

          FOREIGN KEY (message_type_id) REFERENCES m_message_types (id)  ON DELETE SET NULL
        );`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('m_reply_content_types');
  }
}
