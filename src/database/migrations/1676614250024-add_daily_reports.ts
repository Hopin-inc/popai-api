import { MigrationInterface, QueryRunner } from "typeorm";

export class addDailyReports1676614250024 implements MigrationInterface {
    name = 'addDailyReports1676614250024'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`daily_reports\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`company_id\` int NOT NULL, \`todo_ids_yesterday\` json NOT NULL, \`todo_ids_delayed\` json NOT NULL, \`todo_ids_ongoing\` json NOT NULL, \`section_ids\` json NOT NULL, \`slack_channel_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL, \`slack_ts\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`daily_reports\` ADD CONSTRAINT \`FK_d260f5edfb269aa9b85b906ba25\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`daily_reports\` ADD CONSTRAINT \`FK_5bc9073f7de177a46352701adeb\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`daily_reports\` DROP FOREIGN KEY \`FK_5bc9073f7de177a46352701adeb\``);
        await queryRunner.query(`ALTER TABLE \`daily_reports\` DROP FOREIGN KEY \`FK_d260f5edfb269aa9b85b906ba25\``);
        await queryRunner.query(`DROP TABLE \`daily_reports\``);
    }

}
