import { MigrationInterface, QueryRunner } from "typeorm";

export class addAskPlanMilestone1676803309554 implements MigrationInterface {
    name = 'addAskPlanMilestone1676803309554'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`m_event_timings\` ADD \`ask_plan_milestone\` time NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`m_event_timings\` DROP COLUMN \`ask_plan_milestone\``);
    }

}
