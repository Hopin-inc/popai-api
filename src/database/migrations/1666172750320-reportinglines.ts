import { MigrationInterface, QueryRunner } from 'typeorm';

export class reportinglines1666172750320 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE reporting_lines (
          id INT NOT NULL AUTO_INCREMENT,
          superior_user_id INT NULL,
          subordinate_user_id INT NULL,
          PRIMARY KEY(id),
       
          FOREIGN KEY (superior_user_id) REFERENCES users (id)  ON DELETE SET NULL,
          FOREIGN KEY (subordinate_user_id) REFERENCES users (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('reporting_lines');
  }
}
