import { MigrationInterface, QueryRunner } from 'typeorm';

export class addSectionIdToTodos1667557866389 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos ADD section_id INT NULL AFTER company_id`);

    await queryRunner.query(
      `ALTER TABLE todos ADD CONSTRAINT section_id_index FOREIGN KEY (section_id) REFERENCES sections (id)  ON DELETE SET NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE todos DROP FOREIGN KEY section_id_index`);
    await queryRunner.query(`ALTER TABLE todos DROP COLUMN section_id`);
  }
}
