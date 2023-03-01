import { MigrationInterface, QueryRunner } from "typeorm";

export class createPropertyOption1677073507424 implements MigrationInterface {
    name = 'createPropertyOption1677073507424'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`property_options\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`property_id\` int NOT NULL, \`option_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`usage\` int NULL, \`name\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`property_options\` ADD CONSTRAINT \`FK_dd6aa46bc6d87ee2538817d7129\` FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`property_options\` DROP FOREIGN KEY \`FK_dd6aa46bc6d87ee2538817d7129\``);
        await queryRunner.query(`DROP TABLE \`property_options\``);
    }

}
