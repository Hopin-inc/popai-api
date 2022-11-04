import { MigrationInterface, QueryRunner } from 'typeorm';

export class companyBoards1667468936385 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE company_boards (
          id INT NOT NULL AUTO_INCREMENT,
          company_id INT NULL,
          todoapp_id INT NULL,
          board_id VARCHAR(255) NULL,
          PRIMARY KEY(id),
          
          FOREIGN KEY (company_id) REFERENCES companies (id)  ON DELETE SET NULL,
          FOREIGN KEY (todoapp_id) REFERENCES m_todo_apps (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('company_boards');
  }
}
