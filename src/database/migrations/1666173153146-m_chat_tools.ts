import { MigrationInterface, QueryRunner } from 'typeorm';

export class mChatTools1666173153146 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE TABLE m_chat_tools (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      PRIMARY KEY(id)
    );`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('m_chat_tools');
  }
}
