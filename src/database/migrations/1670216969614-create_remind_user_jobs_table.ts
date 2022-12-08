import { MigrationInterface, QueryRunner } from 'typeorm';

export class createRemindUserJobsTable1670216969614 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE remind_user_jobs (
          id INT NOT NULL AUTO_INCREMENT,
          user_id INT NULL,
          status  INT NOT NULL DEFAULT 0,
          created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NULL,

          PRIMARY KEY(id),

          FOREIGN KEY (user_id) REFERENCES users (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('remind_user_jobs');
  }
}
