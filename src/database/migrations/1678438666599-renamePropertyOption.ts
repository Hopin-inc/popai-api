import { MigrationInterface, QueryRunner } from "typeorm";

export class renamePropertyOption1678438666599 implements MigrationInterface {
  name = "renamePropertyOption1678438666599";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `properties` RENAME TO `s_properties`");
    await queryRunner.query("ALTER TABLE `option_candidates` RENAME TO `s_options`");
    await queryRunner.query("ALTER TABLE `property_options` RENAME TO `s_property_options`");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `s_properties` RENAME TO `properties`");
    await queryRunner.query("ALTER TABLE `s_options` RENAME TO `option_candidates`");
    await queryRunner.query("ALTER TABLE `s_property_options` RENAME TO `property_options`");
  }

}
