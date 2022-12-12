import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTodoSections1670710307674 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE todo_sections
        (
            id         INT NOT NULL AUTO_INCREMENT,
            todo_id    INT NULL,
            section_id INT NULL,
            PRIMARY KEY (id),
            CONSTRAINT todo_users_todo_id_user_id_index UNIQUE (todo_id, user_id),

            FOREIGN KEY (board_id) REFERENCES sections (id) ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
