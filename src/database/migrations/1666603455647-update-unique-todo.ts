import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateUniqueTodo1666603455647 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos MODIFY COLUMN todoapp_reg_id VARCHAR(255)`);

    await queryRunner.query(`
        ALTER TABLE todos ADD UNIQUE todoapp_id_todoapp_reg_id_assigned_user_id_index (todoapp_id, todoapp_reg_id, assigned_user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos MODIFY COLUMN todoapp_reg_id INT`);

    await queryRunner.query(`
    ALTER TABLE todos DROP INDEX todoapp_id_todoapp_reg_id_assigned_user_id_index`);
  }
}
