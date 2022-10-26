import { MigrationInterface, QueryRunner } from 'typeorm';

export class mCompanyConditions1666753396954 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE m_company_conditions (
          id INT NOT NULL AUTO_INCREMENT,
          company_id INT NULL,
          remind_before_days INT NULL,
          PRIMARY KEY(id),
          
          CONSTRAINT company_id UNIQUE (company_id),
          FOREIGN KEY (company_id) REFERENCES companies (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('m_company_conditions');
  }
}
