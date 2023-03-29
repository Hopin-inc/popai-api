import { MigrationInterface, QueryRunner } from "typeorm";

export class addBoardRelatedTables1679470620027 implements MigrationInterface {
    name = 'addBoardRelatedTables1679470620027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`s_property_usages\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`board_id\` int NOT NULL, \`app_property_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`type\` int NOT NULL, \`usage\` int NOT NULL, \`app_options\` json NULL, \`bool_value\` tinyint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`s_boards\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`todo_app_id\` int NOT NULL, \`app_board_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`s_board_configs\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`company_id\` int NOT NULL, \`section_id\` int NULL, \`board_id\` int NOT NULL, UNIQUE INDEX \`REL_e597c3dbadcbab4c62e97ecaeb\` (\`company_id\`), UNIQUE INDEX \`REL_2ffd9af7a8036182532704cac3\` (\`section_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`s_property_usages\` ADD CONSTRAINT \`FK_7947a82f3c9f842aa70a0fcab2c\` FOREIGN KEY (\`board_id\`) REFERENCES \`s_boards\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_boards\` ADD CONSTRAINT \`FK_c6210b76393219a4ee7b0f64cc1\` FOREIGN KEY (\`todo_app_id\`) REFERENCES \`m_todo_apps\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_board_configs\` ADD CONSTRAINT \`FK_e597c3dbadcbab4c62e97ecaeb4\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_board_configs\` ADD CONSTRAINT \`FK_2ffd9af7a8036182532704cac3b\` FOREIGN KEY (\`section_id\`) REFERENCES \`s_sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_board_configs\` ADD CONSTRAINT \`FK_8260878c864f360f995fc80997c\` FOREIGN KEY (\`board_id\`) REFERENCES \`s_boards\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_prospect_timings\` ADD CONSTRAINT \`FK_e930c06d89a86c5a12b7d58ef98\` FOREIGN KEY (\`config_id\`) REFERENCES \`s_prospect_configs\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_prospect_timings\` DROP FOREIGN KEY \`FK_e930c06d89a86c5a12b7d58ef98\``);
        await queryRunner.query(`ALTER TABLE \`s_board_configs\` DROP FOREIGN KEY \`FK_8260878c864f360f995fc80997c\``);
        await queryRunner.query(`ALTER TABLE \`s_board_configs\` DROP FOREIGN KEY \`FK_2ffd9af7a8036182532704cac3b\``);
        await queryRunner.query(`ALTER TABLE \`s_board_configs\` DROP FOREIGN KEY \`FK_e597c3dbadcbab4c62e97ecaeb4\``);
        await queryRunner.query(`ALTER TABLE \`s_boards\` DROP FOREIGN KEY \`FK_c6210b76393219a4ee7b0f64cc1\``);
        await queryRunner.query(`ALTER TABLE \`s_property_usages\` DROP FOREIGN KEY \`FK_7947a82f3c9f842aa70a0fcab2c\``);
        await queryRunner.query(`DROP INDEX \`REL_2ffd9af7a8036182532704cac3\` ON \`s_board_configs\``);
        await queryRunner.query(`DROP INDEX \`REL_e597c3dbadcbab4c62e97ecaeb\` ON \`s_board_configs\``);
        await queryRunner.query(`DROP TABLE \`s_board_configs\``);
        await queryRunner.query(`DROP TABLE \`s_boards\``);
        await queryRunner.query(`DROP TABLE \`s_property_usages\``);
    }

}
