import { MigrationInterface, QueryRunner } from 'typeorm';

export class createLabelSections1670563513895 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE label_sections
        (
            id       INT NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NULL,
            board_id INT NULL,
            label_id VARCHAR(255) NULL,
            PRIMARY KEY (id),

            FOREIGN KEY (board_id) REFERENCES sections (id) ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('label_sections');
  }

}
