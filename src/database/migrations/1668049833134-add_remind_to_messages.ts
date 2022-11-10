import { MigrationInterface, QueryRunner } from 'typeorm';

export class addRemindToMessages1668049833134 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE messages 
        ADD COLUMN remind_type TINYINT(1) DEFAULT 0 
        COMMENT  '0: リマインドでない, 1: 期日に対するリマインド, 2: 担当者未設定に対するリマインド, 3: 期日未設定に対するリマインド, 4: 担当者・期日未設定に対するリマインド',
        ADD COLUMN remind_before_days VARCHAR(255) NULL 
        `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE messages 
          DROP COLUMN remind_type ,
          DROP COLUMN remind_before_days 
        `
    );
  }
}
