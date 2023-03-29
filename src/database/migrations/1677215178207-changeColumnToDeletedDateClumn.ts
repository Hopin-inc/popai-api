import { MigrationInterface, QueryRunner } from "typeorm";

export class changeColumnToDeletedDateClumn1677215178207 implements MigrationInterface {
  name = "changeColumnToDeletedDateClumn1677215178207";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`property_options\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
    await queryRunner.query(`ALTER TABLE \`properties\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`properties\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
    await queryRunner.query(`ALTER TABLE \`property_options\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
  }

}
