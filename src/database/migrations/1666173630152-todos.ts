import { MigrationInterface, QueryRunner } from 'typeorm';

export class todos1666173630152 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE todos (
          id INT NOT NULL AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          todoapp_id INT NULL,
          todoapp_reg_id INT NULL,
          todoapp_reg_created_by INT NULL,
          todoapp_reg_created_at DATETIME NULL,
          assigned_user_id INT NULL,
          deadline DATETIME NULL,
          is_done BOOLEAN,
          is_reminded BOOLEAN,
          is_rescheduled BOOLEAN,
          PRIMARY KEY(id),

          FOREIGN KEY (todoapp_id) REFERENCES m_todo_apps (id)  ON DELETE SET NULL,
          FOREIGN KEY (assigned_user_id) REFERENCES users (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('todos');
  }
}
