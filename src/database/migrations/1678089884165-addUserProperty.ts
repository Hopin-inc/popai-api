import { MigrationInterface, QueryRunner } from "typeorm";

export class addUserProperty1678089884165 implements MigrationInterface {
  name = "addUserProperty1678089884165";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`document_tool_users\`
        ADD \`user_name\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
    await queryRunner.query(`ALTER TABLE \`document_tool_users\`
        ADD \`avatar\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
    await queryRunner.query(`ALTER TABLE \`document_tool_users\`
        ADD \`email\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`document_tool_users\` DROP COLUMN \`email\``);
    await queryRunner.query(`ALTER TABLE \`document_tool_users\` DROP COLUMN \`avatar\``);
    await queryRunner.query(`ALTER TABLE \`document_tool_users\` DROP COLUMN \`user_name\``);
  }

}
