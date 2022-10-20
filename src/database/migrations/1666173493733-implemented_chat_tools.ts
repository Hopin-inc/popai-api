import { MigrationInterface, QueryRunner } from 'typeorm';

export class implementedChattools1666173493733 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE implemented_chat_tools (
          id INT NOT NULL AUTO_INCREMENT,
          company_id INT NULL,
          chattool_id INT NULL,
          PRIMARY KEY(id),
          
          FOREIGN KEY (company_id) REFERENCES companies (id)  ON DELETE SET NULL,
          FOREIGN KEY (chattool_id) REFERENCES m_chat_tools (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('implemented_chat_tools');
  }
}
