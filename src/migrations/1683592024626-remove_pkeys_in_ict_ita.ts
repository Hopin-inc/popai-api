import { MigrationInterface, QueryRunner } from "typeorm";

export class removePkeysInIctIta1683592024626 implements MigrationInterface {
    name = "removePkeysInIctIta1683592024626";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP PRIMARY KEY");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` ADD PRIMARY KEY (`company_id`)");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP PRIMARY KEY");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD PRIMARY KEY (`company_id`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` DROP PRIMARY KEY");
        await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` ADD PRIMARY KEY (`chat_tool_id`, `company_id`)");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP PRIMARY KEY");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` ADD PRIMARY KEY (`company_id`, `todo_app_id`)");
    }

}
