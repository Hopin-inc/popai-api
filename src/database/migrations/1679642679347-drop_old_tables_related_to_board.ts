import { MigrationInterface, QueryRunner } from "typeorm";

export class dropOldTablesRelatedToBoard1679642679347 implements MigrationInterface {
  name = "dropOldTablesRelatedToBoard1679642679347";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`s_property_options\``);
    await queryRunner.query(`DROP TABLE \`s_options\``);
    await queryRunner.query(`DROP TABLE \`s_properties\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`s_properties\` (
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` datetime(6) DEFAULT NULL,
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`section_id\` int NOT NULL,
        \`property_id\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`name\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`type\` int NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`FK_625e3251db6578d0669066d7d7d\` (\`section_id\`),
        CONSTRAINT \`FK_625e3251db6578d0669066d7d7d\` FOREIGN KEY (\`section_id\`) REFERENCES \`s_sections\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT
      ) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    );
    await queryRunner.query(`
      CREATE TABLE \`s_options\` (
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` datetime(6) DEFAULT NULL,
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`property_id\` int NOT NULL,
        \`option_id\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`name\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`FK_8edcd1b02f830a90ab4c1097beb\` (\`property_id\`),
        CONSTRAINT \`FK_8edcd1b02f830a90ab4c1097beb\` FOREIGN KEY (\`property_id\`) REFERENCES \`s_properties\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT
      ) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    );
    await queryRunner.query(`
      CREATE TABLE \`s_property_options\` (
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` datetime(6) DEFAULT NULL,
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`property_id\` int NOT NULL,
        \`usage\` int DEFAULT NULL,
        \`option_id\` int DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`FK_677e9e0ddda120524b97d914c33\` (\`property_id\`),
        KEY \`FK_7ec8e9e8b05064951246d5c314a\` (\`option_id\`),
        CONSTRAINT \`FK_677e9e0ddda120524b97d914c33\` FOREIGN KEY (\`property_id\`) REFERENCES \`s_properties\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT \`FK_7ec8e9e8b05064951246d5c314a\` FOREIGN KEY (\`option_id\`) REFERENCES \`s_options\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT
      ) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    );
  }

}
