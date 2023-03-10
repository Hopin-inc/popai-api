import { MigrationInterface, QueryRunner } from "typeorm";

export class changeNameOfProperty1678426171802 implements MigrationInterface {
  name = "changeNameOfProperty1678426171802";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `properties` RENAME TO `board_properties`");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `board_properties` RENAME TO `properties`");
  }

}
