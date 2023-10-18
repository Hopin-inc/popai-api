import { MigrationInterface, QueryRunner } from "typeorm";

export class migrations1697526265297 implements MigrationInterface {
    name = "migrations1697526265297";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `s_setup_features` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` int NOT NULL AUTO_INCREMENT, `setup_config_id` int NOT NULL, `feature` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `s_setup_configs` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` int NOT NULL AUTO_INCREMENT, `company_id` varchar(255) NOT NULL, `current_step` int NOT NULL, `setup_todo_app_id` int NOT NULL, `setup_chat_tool_id` int NOT NULL, UNIQUE INDEX `REL_3731fe8ead37ea7fe8d9d3e734` (`company_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `s_setup_features` ADD CONSTRAINT `FK_e352f23e7620fb8eb5e31570b7f` FOREIGN KEY (`setup_config_id`) REFERENCES `s_setup_configs`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
        await queryRunner.query("ALTER TABLE `s_setup_configs` ADD CONSTRAINT `FK_3731fe8ead37ea7fe8d9d3e7344` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `s_setup_configs` DROP FOREIGN KEY `FK_3731fe8ead37ea7fe8d9d3e7344`");
        await queryRunner.query("ALTER TABLE `s_setup_features` DROP FOREIGN KEY `FK_e352f23e7620fb8eb5e31570b7f`");
        await queryRunner.query("DROP INDEX `REL_3731fe8ead37ea7fe8d9d3e734` ON `s_setup_configs`");
        await queryRunner.query("DROP TABLE `s_setup_configs`");
        await queryRunner.query("DROP TABLE `s_setup_features`");
    }

}
