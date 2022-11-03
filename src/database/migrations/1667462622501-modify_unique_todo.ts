import { MigrationInterface, QueryRunner } from 'typeorm';

export class modifyUniqueTodo1667462622501 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos DROP FOREIGN KEY todos_ibfk_1 `);
    await queryRunner.query(`ALTER TABLE todos DROP FOREIGN KEY todos_ibfk_2 `);
    await queryRunner.query(
      `ALTER TABLE todos DROP INDEX todoapp_id_todoapp_reg_id_assigned_user_id_index`
    );

    await queryRunner.query(`
        ALTER TABLE todos ADD UNIQUE todoapp_id_todoapp_reg_id_index (todoapp_id, todoapp_reg_id)`);

    await queryRunner.query(
      `ALTER TABLE todos ADD FOREIGN KEY (todoapp_id) REFERENCES m_todo_apps (id)  ON DELETE SET NULL `
    );

    await queryRunner.query(
      `ALTER TABLE todos ADD FOREIGN KEY (assigned_user_id) REFERENCES users (id)  ON DELETE SET NULL `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos DROP FOREIGN KEY todos_ibfk_1 `);
    await queryRunner.query(`ALTER TABLE todos DROP FOREIGN KEY todos_ibfk_2 `);

    await queryRunner.query(`  ALTER TABLE todos DROP INDEX todoapp_id_todoapp_reg_id_index`);

    await queryRunner.query(`
    ALTER TABLE todos ADD UNIQUE todoapp_id_todoapp_reg_id_assigned_user_id_index (todoapp_id, todoapp_reg_id, assigned_user_id)`);

    await queryRunner.query(
      `ALTER TABLE todos ADD FOREIGN KEY (todoapp_id) REFERENCES m_todo_apps (id)  ON DELETE SET NULL `
    );

    await queryRunner.query(
      `ALTER TABLE todos ADD FOREIGN KEY (assigned_user_id) REFERENCES users (id)  ON DELETE SET NULL `
    );
  }
}
