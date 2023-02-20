import { MigrationInterface, QueryRunner } from "typeorm";

export class createProperty1676898947420 implements MigrationInterface {
  name = "createProperty1676898947420";

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
                                 UNIQUE INDEX \`REL_84ab42f4fb3d8c1664c6c13e31\` (\`section_id\`),
                                 PRIMARY KEY (\`id\`)
                             ) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`properties\`
        ADD CONSTRAINT \`FK_84ab42f4fb3d8c1664c6c13e313\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`properties\` DROP FOREIGN KEY \`FK_84ab42f4fb3d8c1664c6c13e313\``);
    await queryRunner.query(`DROP INDEX \`REL_84ab42f4fb3d8c1664c6c13e31\` ON \`properties\``);
    await queryRunner.query(`DROP TABLE \`properties\``);
  }

}
