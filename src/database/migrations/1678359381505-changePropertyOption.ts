import { MigrationInterface, QueryRunner } from "typeorm";

export class changePropertyOption1678359381505 implements MigrationInterface {
    name = 'changePropertyOption1678359381505'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`option_candidates\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`property_id\` int NOT NULL, \`option_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`name\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`property_options\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`property_options\` DROP COLUMN \`option_id\``);
        await queryRunner.query(`ALTER TABLE \`property_options\` ADD \`option_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`option_candidates\` ADD CONSTRAINT \`FK_46cfb0bda78e7f6c82f664f5612\` FOREIGN KEY (\`property_id\`) REFERENCES \`properties\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`property_options\` ADD CONSTRAINT \`FK_2244344c11f1195f41745a8fe8e\` FOREIGN KEY (\`option_id\`) REFERENCES \`option_candidates\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`property_options\` DROP FOREIGN KEY \`FK_2244344c11f1195f41745a8fe8e\``);
        await queryRunner.query(`ALTER TABLE \`option_candidates\` DROP FOREIGN KEY \`FK_46cfb0bda78e7f6c82f664f5612\``);
        await queryRunner.query(`ALTER TABLE \`property_options\` DROP COLUMN \`option_id\``);
        await queryRunner.query(`ALTER TABLE \`property_options\` ADD \`option_id\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`property_options\` ADD \`name\` varchar(255) NULL`);
        await queryRunner.query(`DROP TABLE \`option_candidates\``);
    }

}
