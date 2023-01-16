import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeTodoUsersTodoIdUserIdIndexTodoUsers1670208468673 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todo_users DROP FOREIGN KEY todo_users_ibfk_1`);

    await queryRunner.query(`ALTER TABLE todo_users DROP FOREIGN KEY todo_users_ibfk_2`);

    await queryRunner.query(`ALTER TABLE todo_users DROP INDEX todo_users_todo_id_user_id_index`);

    await queryRunner.query(
      `ALTER TABLE todo_users
          ADD FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE todo_users
          ADD FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE todo_users
            ADD
                CONSTRAINT todo_users_todo_id_user_id_index UNIQUE (todo_id, user_id),
        );
    `);
  }
}
