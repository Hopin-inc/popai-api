import { MigrationInterface, QueryRunner } from 'typeorm';

export class lineProfiles1666334452836 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE line_profiles (
          line_id VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NULL,
          picture_url VARCHAR(255) NULL,
          status_message VARCHAR(255) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
          deleted_at DATETIME,
          PRIMARY KEY(line_id)
        );`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('line_profiles');
  }
}
