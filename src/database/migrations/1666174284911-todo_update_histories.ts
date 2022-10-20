import { MigrationInterface, QueryRunner } from 'typeorm';

export class todoUpdateHistories1666174284911 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE todo_update_histories (
          id INT NOT NULL AUTO_INCREMENT,
          todo_id INT NULL,
          todoapp_reg_updated_at DATETIME,
          PRIMARY KEY(id),
    
          FOREIGN KEY (todo_id) REFERENCES todos (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('todo_update_historiess');
  }
}
