import { MigrationInterface, QueryRunner } from "typeorm"

export class column_name1670331028814 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE TABLE column_name (
      id INT NOT NULL AUTO_INCREMENT,
      company_id INT NULL,
      todoapp_id INT NULL,
      todo VARCHAR(255) NOT NULL,
      is_done VARCHAR(255) NOT NULL,
      assignee VARCHAR(255) NOT NULL,
      due VARCHAR(255) NOT NULL,
      created_by VARCHAR(255) NOT NULL,
      created_at VARCHAR(255) NOT NULL,
      PRIMARY KEY(id),
    
      FOREIGN KEY (company_id) REFERENCES companies (id)  ON DELETE SET NULL,
      FOREIGN KEY (todoapp_id) REFERENCES m_todo_apps (id)  ON DELETE SET NULL
    );
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('column_name');
    }

}
