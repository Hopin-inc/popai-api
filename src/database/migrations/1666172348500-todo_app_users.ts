import { MigrationInterface, QueryRunner } from 'typeorm';

export class todoAppUsers1666172348500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE todo_app_users (
          id INT NOT NULL AUTO_INCREMENT,
          employee_id INT NULL,
          todoapp_id INT NULL,
          api_key VARCHAR(255) NULL,
          api_token TEXT NULL,
          refresh_token TEXT NULL,
          expires_in INT NULL,
          PRIMARY KEY(id),
       
          FOREIGN KEY (employee_id) REFERENCES users (id)  ON DELETE SET NULL,
          FOREIGN KEY (todoapp_id) REFERENCES m_todo_apps (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('todo_app_users');
  }
}
