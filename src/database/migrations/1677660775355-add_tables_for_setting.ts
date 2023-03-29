import { MigrationInterface, QueryRunner } from "typeorm";

export class addTablesForSetting1677660775355 implements MigrationInterface {
    name = 'addTablesForSetting1677660775355'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`m_countries\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`code\` char(2) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`name\` varchar(45) COLLATE "utf8mb4_unicode_ci" NOT NULL, PRIMARY KEY (\`code\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`m_timezones\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`zone_name\` varchar(35) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`country_code\` char(2) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`gmt_offset\` int NOT NULL, \`timestamp\` int NOT NULL, PRIMARY KEY (\`zone_name\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`s_timings\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`company_id\` int NOT NULL, \`section_id\` int NULL, \`timezone_name\` varchar(35) COLLATE "utf8mb4_unicode_ci" NULL, \`days_of_week\` json NULL, \`disabled_on_holidays_jp\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`REL_f7450475712dbda5e1917877b2\` (\`company_id\`), UNIQUE INDEX \`REL_4273c9ec86c7f5720d0d215f7b\` (\`section_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`s_timing_exceptions\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`company_id\` int NOT NULL, \`section_id\` int NULL, \`date\` date NULL, \`excluded\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`s_daily_report_timings\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`config_id\` int NOT NULL, \`time\` time NOT NULL, \`enable_pending\` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`s_daily_report_configs\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`company_id\` int NOT NULL, \`section_id\` int NULL, \`enabled\` tinyint NOT NULL DEFAULT 0, \`chat_tool_id\` int NULL, \`channel\` varchar(12) COLLATE "utf8mb4_unicode_ci" NULL, UNIQUE INDEX \`REL_99b45f2241b882809e96dc0074\` (\`company_id\`), UNIQUE INDEX \`REL_4f759152a47e9b0025d1591dca\` (\`section_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`s_notify_configs\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`company_id\` int NOT NULL, \`section_id\` int NULL, \`enabled\` tinyint NOT NULL DEFAULT 0, \`chat_tool_id\` int NULL, \`channel\` varchar(12) COLLATE "utf8mb4_unicode_ci" NULL, UNIQUE INDEX \`REL_6a97ee381b6bda2883c3d40ce0\` (\`company_id\`), UNIQUE INDEX \`REL_d55461583cec386152d1101220\` (\`section_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`s_prospect_timings\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`config_id\` int NOT NULL, \`time\` time NOT NULL, \`ask_plan\` tinyint NOT NULL DEFAULT 0, \`ask_plan_milestone\` time NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`s_prospect_configs\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`company_id\` int NOT NULL, \`section_id\` int NULL, \`enabled\` tinyint NOT NULL DEFAULT 0, \`chat_tool_id\` int NULL, \`channel\` varchar(12) COLLATE "utf8mb4_unicode_ci" NULL, \`from\` tinyint NULL, \`to\` tinyint NULL, \`from_days_before\` tinyint NULL, \`begin_of_week\` tinyint NULL, \`frequency\` tinyint NULL, \`frequency_days_before\` json NULL, UNIQUE INDEX \`REL_d2605807496ad103e5fa534223\` (\`company_id\`), UNIQUE INDEX \`REL_7ee99bceef013e533586880837\` (\`section_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`m_timezones\` ADD CONSTRAINT \`FK_9b7cd9832f47140d157f71efd3c\` FOREIGN KEY (\`country_code\`) REFERENCES \`m_countries\`(\`code\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_timings\` ADD CONSTRAINT \`FK_f7450475712dbda5e1917877b21\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_timings\` ADD CONSTRAINT \`FK_4273c9ec86c7f5720d0d215f7b4\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_timings\` ADD CONSTRAINT \`FK_d1133c3f645795fe9a4bfbc2544\` FOREIGN KEY (\`timezone_name\`) REFERENCES \`m_timezones\`(\`zone_name\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_timing_exceptions\` ADD CONSTRAINT \`FK_4632ab5e6b5102e7a1f05907530\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_timing_exceptions\` ADD CONSTRAINT \`FK_f2b56d6acf117e39621b7cce4b5\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_timings\` ADD CONSTRAINT \`FK_9081b3ca4c4e2397827b4acb717\` FOREIGN KEY (\`config_id\`) REFERENCES \`s_daily_report_configs\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` ADD CONSTRAINT \`FK_99b45f2241b882809e96dc00740\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` ADD CONSTRAINT \`FK_4f759152a47e9b0025d1591dca6\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` ADD CONSTRAINT \`FK_7854c3b40d9ba42dddf0b18977e\` FOREIGN KEY (\`chat_tool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` ADD CONSTRAINT \`FK_6a97ee381b6bda2883c3d40ce0b\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` ADD CONSTRAINT \`FK_d55461583cec386152d1101220d\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` ADD CONSTRAINT \`FK_3d212a27308a09282fed7de7cb7\` FOREIGN KEY (\`chat_tool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` ADD CONSTRAINT \`FK_d2605807496ad103e5fa534223b\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` ADD CONSTRAINT \`FK_7ee99bceef013e5335868808376\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` ADD CONSTRAINT \`FK_d1f88dcf2b82d7aa680fff9072d\` FOREIGN KEY (\`chat_tool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` DROP FOREIGN KEY \`FK_d1f88dcf2b82d7aa680fff9072d\``);
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` DROP FOREIGN KEY \`FK_7ee99bceef013e5335868808376\``);
        await queryRunner.query(`ALTER TABLE \`s_prospect_configs\` DROP FOREIGN KEY \`FK_d2605807496ad103e5fa534223b\``);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` DROP FOREIGN KEY \`FK_3d212a27308a09282fed7de7cb7\``);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` DROP FOREIGN KEY \`FK_d55461583cec386152d1101220d\``);
        await queryRunner.query(`ALTER TABLE \`s_notify_configs\` DROP FOREIGN KEY \`FK_6a97ee381b6bda2883c3d40ce0b\``);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` DROP FOREIGN KEY \`FK_7854c3b40d9ba42dddf0b18977e\``);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` DROP FOREIGN KEY \`FK_4f759152a47e9b0025d1591dca6\``);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` DROP FOREIGN KEY \`FK_99b45f2241b882809e96dc00740\``);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_timings\` DROP FOREIGN KEY \`FK_9081b3ca4c4e2397827b4acb717\``);
        await queryRunner.query(`ALTER TABLE \`s_timing_exceptions\` DROP FOREIGN KEY \`FK_f2b56d6acf117e39621b7cce4b5\``);
        await queryRunner.query(`ALTER TABLE \`s_timing_exceptions\` DROP FOREIGN KEY \`FK_4632ab5e6b5102e7a1f05907530\``);
        await queryRunner.query(`ALTER TABLE \`s_timings\` DROP FOREIGN KEY \`FK_d1133c3f645795fe9a4bfbc2544\``);
        await queryRunner.query(`ALTER TABLE \`s_timings\` DROP FOREIGN KEY \`FK_4273c9ec86c7f5720d0d215f7b4\``);
        await queryRunner.query(`ALTER TABLE \`s_timings\` DROP FOREIGN KEY \`FK_f7450475712dbda5e1917877b21\``);
        await queryRunner.query(`ALTER TABLE \`m_timezones\` DROP FOREIGN KEY \`FK_9b7cd9832f47140d157f71efd3c\``);
        await queryRunner.query(`DROP INDEX \`REL_7ee99bceef013e533586880837\` ON \`s_prospect_configs\``);
        await queryRunner.query(`DROP INDEX \`REL_d2605807496ad103e5fa534223\` ON \`s_prospect_configs\``);
        await queryRunner.query(`DROP TABLE \`s_prospect_configs\``);
        await queryRunner.query(`DROP TABLE \`s_prospect_timings\``);
        await queryRunner.query(`DROP INDEX \`REL_d55461583cec386152d1101220\` ON \`s_notify_configs\``);
        await queryRunner.query(`DROP INDEX \`REL_6a97ee381b6bda2883c3d40ce0\` ON \`s_notify_configs\``);
        await queryRunner.query(`DROP TABLE \`s_notify_configs\``);
        await queryRunner.query(`DROP INDEX \`REL_4f759152a47e9b0025d1591dca\` ON \`s_daily_report_configs\``);
        await queryRunner.query(`DROP INDEX \`REL_99b45f2241b882809e96dc0074\` ON \`s_daily_report_configs\``);
        await queryRunner.query(`DROP TABLE \`s_daily_report_configs\``);
        await queryRunner.query(`DROP TABLE \`s_daily_report_timings\``);
        await queryRunner.query(`DROP TABLE \`s_timing_exceptions\``);
        await queryRunner.query(`DROP INDEX \`REL_4273c9ec86c7f5720d0d215f7b\` ON \`s_timings\``);
        await queryRunner.query(`DROP INDEX \`REL_f7450475712dbda5e1917877b2\` ON \`s_timings\``);
        await queryRunner.query(`DROP TABLE \`s_timings\``);
        await queryRunner.query(`DROP TABLE \`m_timezones\``);
        await queryRunner.query(`DROP TABLE \`m_countries\``);
    }

}
