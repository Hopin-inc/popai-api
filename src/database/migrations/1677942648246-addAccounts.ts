import { MigrationInterface, QueryRunner } from "typeorm";

export class addAccounts1677942648246 implements MigrationInterface {
  name = "addAccounts1677942648246";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(`CREATE TABLE \`s_accounts\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`deleted_at\` datetime(6) NULL, \`uid\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`email\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`name\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`company_id\` int NOT NULL, PRIMARY KEY (\`uid\`)) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`s_accounts\` ADD CONSTRAINT \`FK_a5f3357c397391f63ba51864c3f\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`s_accounts\` DROP FOREIGN KEY \`FK_a5f3357c397391f63ba51864c3f\``);
    await queryRunner.query(`DROP TABLE \`s_accounts\``);
  }

}
