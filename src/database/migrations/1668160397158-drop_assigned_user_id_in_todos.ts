import { MigrationInterface, QueryRunner } from 'typeorm';

export class dropAssignedUserIdInTodos1668160397158 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos DROP FOREIGN KEY todos_ibfk_2 `);
    await queryRunner.query(`ALTER TABLE todos DROP COLUMN assigned_user_id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE todos 
              ADD COLUMN assigned_user_id INT NULL AFTER todoapp_reg_created_at `
    );
    await queryRunner.query(
      `ALTER TABLE todos ADD FOREIGN KEY (assigned_user_id) REFERENCES users (id)  ON DELETE SET NULL `
    );
  }
}
