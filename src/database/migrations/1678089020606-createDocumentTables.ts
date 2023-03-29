import { MigrationInterface, QueryRunner } from "typeorm";

export class createDocumentTables1678089020606 implements MigrationInterface {
  name = "createDocumentTables1678089020606";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`document_tool_users\`
                             (
                                 \`created_at\`       datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP (6),
                                 \`updated_at\`       datetime NULL ON UPDATE CURRENT_TIMESTAMP,
                                 \`deleted_at\`       datetime(6) NULL,
                                 \`auth_key\`         varchar(255) COLLATE "utf8mb4_unicode_ci" NULL,
                                 \`user_id\`          int NOT NULL,
                                 \`document_tool_id\` int NOT NULL,
                                 PRIMARY KEY (\`user_id\`, \`document_tool_id\`)
                             ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`implemented_document_tools\`
                             (
                                 \`created_at\`       datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP (6),
                                 \`updated_at\`       datetime NULL ON UPDATE CURRENT_TIMESTAMP,
                                 \`deleted_at\`       datetime(6) NULL,
                                 \`company_id\`       int NOT NULL,
                                 \`document_tool_id\` int NOT NULL,
                                 PRIMARY KEY (\`company_id\`, \`document_tool_id\`)
                             ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`m_document_tools\`
                             (
                                 \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP (6),
                                 \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP,
                                 \`deleted_at\` datetime(6) NULL,
                                 \`id\`         int                                       NOT NULL AUTO_INCREMENT,
                                 \`name\`       varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL,
                                 \`tool_code\`  varchar(25) COLLATE "utf8mb4_unicode_ci" NULL,
                                 PRIMARY KEY (\`id\`)
                             ) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`document_tool_users\`
        ADD CONSTRAINT \`FK_0b7427b46ef53d6f7672e0a82cb\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    await queryRunner.query(`ALTER TABLE \`document_tool_users\`
        ADD CONSTRAINT \`FK_bee610f6aacd974d35af8d34ab8\` FOREIGN KEY (\`document_tool_id\`) REFERENCES \`m_document_tools\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    await queryRunner.query(`ALTER TABLE \`implemented_document_tools\`
        ADD CONSTRAINT \`FK_cca5885c8f7c3ca5087f305ffb6\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    await queryRunner.query(`ALTER TABLE \`implemented_document_tools\`
        ADD CONSTRAINT \`FK_0c60fbc026be09d4a6065ea7f5a\` FOREIGN KEY (\`document_tool_id\`) REFERENCES \`m_document_tools\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`implemented_document_tools\` DROP FOREIGN KEY \`FK_0c60fbc026be09d4a6065ea7f5a\``);
    await queryRunner.query(`ALTER TABLE \`implemented_document_tools\` DROP FOREIGN KEY \`FK_cca5885c8f7c3ca5087f305ffb6\``);
    await queryRunner.query(`ALTER TABLE \`document_tool_users\` DROP FOREIGN KEY \`FK_bee610f6aacd974d35af8d34ab8\``);
    await queryRunner.query(`ALTER TABLE \`document_tool_users\` DROP FOREIGN KEY \`FK_0b7427b46ef53d6f7672e0a82cb\``);
    await queryRunner.query(`DROP TABLE \`m_document_tools\``);
    await queryRunner.query(`DROP TABLE \`implemented_document_tools\``);
    await queryRunner.query(`DROP TABLE \`document_tool_users\``);
  }

}
