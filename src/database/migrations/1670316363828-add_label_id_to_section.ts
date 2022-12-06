import { MigrationInterface, QueryRunner } from "typeorm"

export class migrations1670313885059 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE sections ADD COLUMN label_id VARCHAR(255) NULL AFTER board_id;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
            await queryRunner.query(`ALTER TABLE sections DROP COLUMN label_id;`);
    }
}