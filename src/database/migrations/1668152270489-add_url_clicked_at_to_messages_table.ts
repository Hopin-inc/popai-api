import { MigrationInterface, QueryRunner } from 'typeorm';

export class addUrlClickedAtToMessagesTable1668152270489 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE messages 
            ADD COLUMN url_clicked_at DATETIME NULL AFTER is_replied `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE messages 
                DROP COLUMN url_clicked_at 
              `
    );
  }
}
