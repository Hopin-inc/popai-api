import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class mTodoApps1666167349523 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE TABLE m_todo_apps (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      company_id INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      PRIMARY KEY(id),

      FOREIGN KEY (company_id) REFERENCES companies (id)  ON DELETE SET NULL
    );`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('m_todo_apps');
  }
}
