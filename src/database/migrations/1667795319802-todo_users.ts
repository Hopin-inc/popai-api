import { MigrationInterface, QueryRunner } from 'typeorm';

export class todoUsers1667795319802 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE todo_users (
          id INT NOT NULL AUTO_INCREMENT,
          todo_id INT NULL,
          user_id INT NULL,
          PRIMARY KEY(id),
          CONSTRAINT todo_users_todo_id_user_id_index UNIQUE (todo_id,user_id),
          
          FOREIGN KEY (todo_id) REFERENCES todos (id)  ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('todo_users');
  }
}
