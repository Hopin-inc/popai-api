import { MigrationInterface, QueryRunner } from "typeorm";

export class prospectAddRespondedAt1676525570710 implements MigrationInterface {
    name = 'prospectAddRespondedAt1676525570710'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD \`prospect_responded_at\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`prospects\` ADD \`action_responded_at\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP COLUMN \`action_responded_at\``);
        await queryRunner.query(`ALTER TABLE \`prospects\` DROP COLUMN \`prospect_responded_at\``);
    }

}
