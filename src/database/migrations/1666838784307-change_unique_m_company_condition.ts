import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeUniqueMCompanyCondition1666838784307 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE m_company_conditions DROP FOREIGN KEY m_company_conditions_ibfk_1 `
    );

    await queryRunner.query(`
        ALTER TABLE m_company_conditions DROP INDEX company_id`);

    await queryRunner.query(
      `ALTER TABLE m_company_conditions ADD FOREIGN KEY (company_id) REFERENCES companies (id)  ON DELETE SET NULL `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE m_company_conditions ADD CONSTRAINT company_id UNIQUE (company_id)`);
  }
}
