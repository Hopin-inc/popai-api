import { MigrationInterface, QueryRunner } from 'typeorm';

export class addBoardAdminUserIdToSections1668390431375 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sections 
    ADD board_admin_user_id INT NULL,
    ADD CONSTRAINT sections_board_admin_user_id_index FOREIGN KEY (board_admin_user_id) REFERENCES users (id)  ON DELETE SET NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sections DROP FOREIGN KEY sections_board_admin_user_id_index`
    );
    await queryRunner.query(`ALTER TABLE sections DROP COLUMN board_admin_user_id`);
  }
}
