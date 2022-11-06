import { MigrationInterface, QueryRunner } from 'typeorm';

export class addUniqueBoadIdInCompanyBoards1667545811397 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE company_boards ADD CONSTRAINT board_id_index UNIQUE (board_id)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`  ALTER TABLE company_boards DROP INDEX board_id_index`);
  }
}
