import { MigrationInterface, QueryRunner } from "typeorm";

export class migrations1697527288583 implements MigrationInterface {
    name = "migrations1697527288583";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `s_setup_configs` CHANGE `current_step` `current_step` int NULL");
        await queryRunner.query("ALTER TABLE `s_setup_configs` CHANGE `setup_todo_app_id` `setup_todo_app_id` int NULL");
        await queryRunner.query("ALTER TABLE `s_setup_configs` CHANGE `setup_chat_tool_id` `setup_chat_tool_id` int NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `s_setup_configs` CHANGE `setup_chat_tool_id` `setup_chat_tool_id` int NOT NULL");
        await queryRunner.query("ALTER TABLE `s_setup_configs` CHANGE `setup_todo_app_id` `setup_todo_app_id` int NOT NULL");
        await queryRunner.query("ALTER TABLE `s_setup_configs` CHANGE `current_step` `current_step` int NOT NULL");
    }

}
