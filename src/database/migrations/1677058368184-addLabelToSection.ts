import { MigrationInterface, QueryRunner } from "typeorm";

export class addLabelToSection1677058368184 implements MigrationInterface {
  name = "addLabelToSection1677058368184";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`sections\`
        ADD \`label_id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`sections\` DROP COLUMN \`label_id\``);
  }

}
