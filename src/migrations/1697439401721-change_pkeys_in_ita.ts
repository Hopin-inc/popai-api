import { MigrationInterface, QueryRunner } from "typeorm";

export class changePkeysInIta1697439401721 implements MigrationInterface {
    columns = "changePkeysInIta1697439401721";
    
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP PRIMARY KEY");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` ADD `id` INT NOT NULL AUTO_INCREMENT AFTER `deleted_at`, ADD PRIMARY KEY (`id`)");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP FOREIGN KEY `FK_64e0b06ca3acaa5a05f3e96c7fb`");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP INDEX `REL_64e0b06ca3acaa5a05f3e96c7f`");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` ADD UNIQUE `TODO_APP_UNI` (`company_id`, (coalesce(`deleted_at`, '1970-01-01 00:00:01')))");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` ADD CONSTRAINT `FK_64e0b06ca3acaa5a05f3e96c7fb` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP COLUMN `id`");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP FOREIGN KEY `FK_64e0b06ca3acaa5a05f3e96c7fb`");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` DROP INDEX `TODO_APP_UNI`");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` ADD PRIMARY KEY (`company_id`)");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` ADD CONSTRAINT `FK_64e0b06ca3acaa5a05f3e96c7fb` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
        await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` ADD UNIQUE INDEX `REL_64e0b06ca3acaa5a05f3e96c7f` (`company_id`)");
    }

}
