import { MigrationInterface, QueryRunner, TableColumn, Table, TableForeignKey } from 'typeorm';

export class implementedTodoApps1666167425474 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE implemented_todo_apps (
          id INT NOT NULL AUTO_INCREMENT,
          auth_key VARCHAR(255) NULL,
          application_id VARCHAR(255) NULL,
          tenant_id VARCHAR(255) NULL,
          client_secret VARCHAR(255) NULL,
          company_id INT NULL,
          todoapp_id INT NULL,
          PRIMARY KEY(id),
          
          FOREIGN KEY (company_id) REFERENCES companies (id)  ON DELETE SET NULL,
          FOREIGN KEY (todoapp_id) REFERENCES m_todo_apps (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('implemented_todo_apps');
  }
}
