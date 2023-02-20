import { MigrationInterface, QueryRunner } from "typeorm";

export class prospectInit1676469011600 implements MigrationInterface {
    name = 'prospectInit1676469011600'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`prospects\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`todo_id\` int NOT NULL, \`user_id\` int NOT NULL, \`company_id\` int NOT NULL, \`prospect\` tinyint(1) NULL, \`action\` tinyint(1) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`m_event_timings\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`company_id\` int NOT NULL, \`event\` tinyint(1) NOT NULL, \`days_of_week\` json NOT NULL, \`time\` time NOT NULL, \`ask_plan\` tinyint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD CONSTRAINT \`FK_34cd453f727ade2851681dc0851\` FOREIGN KEY (\`todo_id\`) REFERENCES \`todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD CONSTRAINT \`FK_19e1a61850b24fe8a13a9b4d171\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD CONSTRAINT \`FK_cc6685ef8b6070cb93ee631310d\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`m_event_timings\` ADD CONSTRAINT \`FK_7dcc828d9122324d233c84d7f50\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`m_event_timings\` DROP FOREIGN KEY \`FK_7dcc828d9122324d233c84d7f50\``);
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP FOREIGN KEY \`FK_cc6685ef8b6070cb93ee631310d\``);
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP FOREIGN KEY \`FK_19e1a61850b24fe8a13a9b4d171\``);
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP FOREIGN KEY \`FK_34cd453f727ade2851681dc0851\``);
        await queryRunner.query(`DROP TABLE \`m_event_timings\``);
        await queryRunner.query(`DROP TABLE \`prospects\``);
    }

}
