import { MigrationInterface, QueryRunner } from "typeorm";

export class createProperty1676939333305 implements MigrationInterface {
  name = "createProperty1676939333305";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`properties\`
                             (
                                 \`created_at\`  datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP (6),
                                 \`updated_at\`  datetime NULL ON UPDATE CURRENT_TIMESTAMP,
                                 \`deleted_at\`  datetime NULL,
                                 \`id\`          int                                       NOT NULL AUTO_INCREMENT,
                                 \`section_id\`  int                                       NOT NULL,
                                 \`property_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL,
                                 \`name\`        varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL,
                                 \`type\`        int                                       NOT NULL,
                                 \`usage\`       int NULL,
                                 PRIMARY KEY (\`id\`)
                             ) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`properties\`
        ADD CONSTRAINT \`FK_84ab42f4fb3d8c1664c6c13e313\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`properties\` DROP FOREIGN KEY \`FK_84ab42f4fb3d8c1664c6c13e313\``);
    await queryRunner.query(`DROP TABLE \`properties\``);
  }

}
