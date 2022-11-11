import { MigrationInterface, QueryRunner } from 'typeorm';

export class dropColumnsImplementedTodoApps1668159786273 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE implemented_todo_apps 
              DROP COLUMN application_id ,
              DROP COLUMN tenant_id ,
              DROP COLUMN client_secret 
        `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE implemented_todo_apps 
        ADD COLUMN  application_id VARCHAR(255) NULL AFTER auth_key,
        ADD COLUMN tenant_id VARCHAR(255) NULL AFTER application_id,
        ADD COLUMN client_secret VARCHAR(255) NULL AFTER tenant_id
        `
    );
  }
}
