import { MigrationInterface, QueryRunner } from "typeorm";

export class implementProjectsInConfig1685754412135 implements MigrationInterface {
  name = "implementProjectsInConfig1685754412135";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `s_prospect_configs` DROP FOREIGN KEY `FK_d2605807496ad103e5fa534223b`");
    await queryRunner.query("DROP INDEX `REL_d2605807496ad103e5fa534223` ON `s_prospect_configs`");
    await queryRunner.query("CREATE TABLE `t_todo_projects` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `todo_id` varchar(255) NOT NULL, `project_id` varchar(255) NOT NULL, PRIMARY KEY (`todo_id`, `project_id`)) ENGINE=InnoDB");
    await queryRunner.query("CREATE TABLE `t_project_users` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `project_id` varchar(255) NOT NULL, `user_id` varchar(255) NOT NULL, PRIMARY KEY (`project_id`, `user_id`)) ENGINE=InnoDB");
    await queryRunner.query("CREATE TABLE `t_project_histories` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` int NOT NULL AUTO_INCREMENT, `project_id` varchar(255) NULL, `property` int NOT NULL, `action` int NOT NULL, `start_date` datetime NULL, `deadline` datetime NULL, `user_ids` json NULL, `days_diff` int NULL, `app_updated_at` datetime NULL, INDEX `IDX_8498e458b1fd1de0cd838f1d04` (`project_id`), INDEX `IDX_5d397cf4c858b24fa1b14760e4` (`property`), INDEX `IDX_e8840cafce8b48bb95742f9280` (`action`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    await queryRunner.query("CREATE TABLE `t_projects` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` varchar(36) NOT NULL, `name` varchar(255) NOT NULL, `todo_app_id` int NOT NULL, `company_id` varchar(255) NOT NULL, `app_project_id` varchar(255) NOT NULL, `app_url` varchar(255) NULL, `app_created_by` varchar(255) NULL, `app_created_at` datetime NULL, `start_date` date NULL, `deadline` date NULL, `is_done` tinyint NOT NULL DEFAULT 0, `is_closed` tinyint NOT NULL DEFAULT 0, INDEX `IDX_6329106a485260315b011f5a8e` (`app_project_id`), INDEX `IDX_678208e73e62bb2ced479c2fb1` (`app_url`), INDEX `IDX_065ed6d879a152371951b77936` (`start_date`), INDEX `IDX_520e7c63c35d1ea9c72cf7af96` (`deadline`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    await queryRunner.query("ALTER TABLE `t_todos` DROP COLUMN `created_by`");
    await queryRunner.query("ALTER TABLE `s_prospect_timings` DROP COLUMN `ask_plan`");
    await queryRunner.query("ALTER TABLE `s_prospect_timings` DROP COLUMN `ask_plan_milestone`");
    await queryRunner.query("ALTER TABLE `t_todo_histories` ADD `project_ids` json NULL");
    await queryRunner.query("ALTER TABLE `t_prospects` ADD `project_id` varchar(255) NULL");
    await queryRunner.query("ALTER TABLE `t_todos` ADD `app_parent_todo_id` json NULL");
    await queryRunner.query("ALTER TABLE `t_todos` ADD `app_created_by` varchar(255) NULL");
    await queryRunner.query("ALTER TABLE `s_prospect_timings` ADD `mode` int NOT NULL DEFAULT '0'");
    await queryRunner.query("ALTER TABLE `s_prospect_configs` ADD `type` int NOT NULL DEFAULT '2'");
    await queryRunner.query("ALTER TABLE `s_boards` ADD `company_id` varchar(255) NOT NULL");
    await queryRunner.query("ALTER TABLE `s_boards` ADD `project_rule` int NULL");
    await queryRunner.query("ALTER TABLE `t_todo_histories` DROP FOREIGN KEY `FK_8b4aa7b9c907bda34b461a2bb4f`");
    await queryRunner.query("ALTER TABLE `t_todo_histories` CHANGE `todo_id` `todo_id` varchar(255) NULL");
    await queryRunner.query("ALTER TABLE `t_prospects` DROP FOREIGN KEY `FK_fdb17657c73b5235bf09e579fa0`");
    await queryRunner.query("ALTER TABLE `t_prospects` CHANGE `todo_id` `todo_id` varchar(255) NULL");
    await queryRunner.query("DROP INDEX `IDX_fc15ebf3e122579b99ccccba38` ON `t_todos`");
    await queryRunner.query("ALTER TABLE `t_todos` DROP COLUMN `start_date`");
    await queryRunner.query("ALTER TABLE `t_todos` ADD `start_date` date NULL");
    await queryRunner.query("DROP INDEX `IDX_0dac8bd24a13face6a9cf6b9a0` ON `t_todos`");
    await queryRunner.query("ALTER TABLE `t_todos` DROP COLUMN `deadline`");
    await queryRunner.query("ALTER TABLE `t_todos` ADD `deadline` date NULL");
    await queryRunner.query("CREATE INDEX `IDX_8b4aa7b9c907bda34b461a2bb4` ON `t_todo_histories` (`todo_id`)");
    await queryRunner.query("CREATE INDEX `IDX_fc15ebf3e122579b99ccccba38` ON `t_todos` (`start_date`)");
    await queryRunner.query("CREATE INDEX `IDX_0dac8bd24a13face6a9cf6b9a0` ON `t_todos` (`deadline`)");
    await queryRunner.query("ALTER TABLE `t_todo_histories` ADD CONSTRAINT `FK_8b4aa7b9c907bda34b461a2bb4f` FOREIGN KEY (`todo_id`) REFERENCES `t_todos`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_todo_projects` ADD CONSTRAINT `FK_661edd7026eb67dae48a7e86f35` FOREIGN KEY (`todo_id`) REFERENCES `t_todos`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_todo_projects` ADD CONSTRAINT `FK_aa77dbb94ec70dbd667fadbe8a3` FOREIGN KEY (`project_id`) REFERENCES `t_projects`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_project_users` ADD CONSTRAINT `FK_8a02d106823c08577fa13697246` FOREIGN KEY (`project_id`) REFERENCES `t_projects`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_project_users` ADD CONSTRAINT `FK_94663bf4ad387dde9d9ee178fa0` FOREIGN KEY (`user_id`) REFERENCES `s_users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_project_histories` ADD CONSTRAINT `FK_8498e458b1fd1de0cd838f1d04c` FOREIGN KEY (`project_id`) REFERENCES `t_projects`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_projects` ADD CONSTRAINT `FK_1c781f9345e70c31209417e6297` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_prospects` ADD CONSTRAINT `FK_fdb17657c73b5235bf09e579fa0` FOREIGN KEY (`todo_id`) REFERENCES `t_todos`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_prospects` ADD CONSTRAINT `FK_c168a2aa0e6995c7b61a29f9a2f` FOREIGN KEY (`project_id`) REFERENCES `t_projects`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `s_prospect_configs` ADD CONSTRAINT `FK_d2605807496ad103e5fa534223b` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `s_boards` ADD CONSTRAINT `FK_64d789e7e53609d9afbce4caba6` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `s_board_configs` DROP FOREIGN KEY `FK_8260878c864f360f995fc80997c`");
    await queryRunner.query("ALTER TABLE `s_board_configs` DROP FOREIGN KEY `FK_e597c3dbadcbab4c62e97ecaeb4`");
    await queryRunner.query("DROP INDEX `REL_e597c3dbadcbab4c62e97ecaeb` ON `s_board_configs`");
    await queryRunner.query("DROP TABLE `s_board_configs`");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE `s_board_configs` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` int NOT NULL AUTO_INCREMENT, `company_id` varchar(255) NOT NULL, `board_id` int NOT NULL, UNIQUE INDEX `REL_e597c3dbadcbab4c62e97ecaeb` (`company_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    await queryRunner.query("ALTER TABLE `s_board_configs` ADD CONSTRAINT `FK_e597c3dbadcbab4c62e97ecaeb4` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `s_board_configs` ADD CONSTRAINT `FK_8260878c864f360f995fc80997c` FOREIGN KEY (`board_id`) REFERENCES `s_boards`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `s_boards` DROP FOREIGN KEY `FK_64d789e7e53609d9afbce4caba6`");
    await queryRunner.query("ALTER TABLE `s_prospect_configs` DROP FOREIGN KEY `FK_d2605807496ad103e5fa534223b`");
    await queryRunner.query("ALTER TABLE `t_prospects` DROP FOREIGN KEY `FK_c168a2aa0e6995c7b61a29f9a2f`");
    await queryRunner.query("ALTER TABLE `t_prospects` DROP FOREIGN KEY `FK_fdb17657c73b5235bf09e579fa0`");
    await queryRunner.query("ALTER TABLE `t_projects` DROP FOREIGN KEY `FK_1c781f9345e70c31209417e6297`");
    await queryRunner.query("ALTER TABLE `t_project_histories` DROP FOREIGN KEY `FK_8498e458b1fd1de0cd838f1d04c`");
    await queryRunner.query("ALTER TABLE `t_project_users` DROP FOREIGN KEY `FK_94663bf4ad387dde9d9ee178fa0`");
    await queryRunner.query("ALTER TABLE `t_project_users` DROP FOREIGN KEY `FK_8a02d106823c08577fa13697246`");
    await queryRunner.query("ALTER TABLE `t_todo_projects` DROP FOREIGN KEY `FK_aa77dbb94ec70dbd667fadbe8a3`");
    await queryRunner.query("ALTER TABLE `t_todo_projects` DROP FOREIGN KEY `FK_661edd7026eb67dae48a7e86f35`");
    await queryRunner.query("ALTER TABLE `t_todo_histories` DROP FOREIGN KEY `FK_8b4aa7b9c907bda34b461a2bb4f`");
    await queryRunner.query("DROP INDEX `IDX_0dac8bd24a13face6a9cf6b9a0` ON `t_todos`");
    await queryRunner.query("DROP INDEX `IDX_fc15ebf3e122579b99ccccba38` ON `t_todos`");
    await queryRunner.query("DROP INDEX `IDX_8b4aa7b9c907bda34b461a2bb4` ON `t_todo_histories`");
    await queryRunner.query("ALTER TABLE `t_todos` DROP COLUMN `deadline`");
    await queryRunner.query("ALTER TABLE `t_todos` ADD `deadline` datetime NULL");
    await queryRunner.query("CREATE INDEX `IDX_0dac8bd24a13face6a9cf6b9a0` ON `t_todos` (`deadline`)");
    await queryRunner.query("ALTER TABLE `t_todos` DROP COLUMN `start_date`");
    await queryRunner.query("ALTER TABLE `t_todos` ADD `start_date` datetime NULL");
    await queryRunner.query("CREATE INDEX `IDX_fc15ebf3e122579b99ccccba38` ON `t_todos` (`start_date`)");
    await queryRunner.query("ALTER TABLE `t_prospects` CHANGE `todo_id` `todo_id` varchar(255) NOT NULL");
    await queryRunner.query("ALTER TABLE `t_prospects` ADD CONSTRAINT `FK_fdb17657c73b5235bf09e579fa0` FOREIGN KEY (`todo_id`) REFERENCES `t_todos`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `t_todo_histories` CHANGE `todo_id` `todo_id` varchar(255) NOT NULL");
    await queryRunner.query("ALTER TABLE `t_todo_histories` ADD CONSTRAINT `FK_8b4aa7b9c907bda34b461a2bb4f` FOREIGN KEY (`todo_id`) REFERENCES `t_todos`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    await queryRunner.query("ALTER TABLE `s_boards` DROP COLUMN `project_rule`");
    await queryRunner.query("ALTER TABLE `s_boards` DROP COLUMN `company_id`");
    await queryRunner.query("ALTER TABLE `s_prospect_configs` DROP COLUMN `type`");
    await queryRunner.query("ALTER TABLE `s_prospect_timings` DROP COLUMN `mode`");
    await queryRunner.query("ALTER TABLE `t_todos` DROP COLUMN `app_created_by`");
    await queryRunner.query("ALTER TABLE `t_todos` DROP COLUMN `app_parent_todo_id`");
    await queryRunner.query("ALTER TABLE `t_prospects` DROP COLUMN `project_id`");
    await queryRunner.query("ALTER TABLE `t_todo_histories` DROP COLUMN `project_ids`");
    await queryRunner.query("ALTER TABLE `s_prospect_timings` ADD `ask_plan_milestone` time NULL");
    await queryRunner.query("ALTER TABLE `s_prospect_timings` ADD `ask_plan` tinyint NOT NULL DEFAULT '0'");
    await queryRunner.query("ALTER TABLE `t_todos` ADD `created_by` varchar(255) NULL");
    await queryRunner.query("DROP INDEX `IDX_520e7c63c35d1ea9c72cf7af96` ON `t_projects`");
    await queryRunner.query("DROP INDEX `IDX_065ed6d879a152371951b77936` ON `t_projects`");
    await queryRunner.query("DROP INDEX `IDX_678208e73e62bb2ced479c2fb1` ON `t_projects`");
    await queryRunner.query("DROP INDEX `IDX_6329106a485260315b011f5a8e` ON `t_projects`");
    await queryRunner.query("DROP TABLE `t_projects`");
    await queryRunner.query("DROP INDEX `IDX_e8840cafce8b48bb95742f9280` ON `t_project_histories`");
    await queryRunner.query("DROP INDEX `IDX_5d397cf4c858b24fa1b14760e4` ON `t_project_histories`");
    await queryRunner.query("DROP INDEX `IDX_8498e458b1fd1de0cd838f1d04` ON `t_project_histories`");
    await queryRunner.query("DROP TABLE `t_project_histories`");
    await queryRunner.query("DROP TABLE `t_project_users`");
    await queryRunner.query("DROP TABLE `t_todo_projects`");
    await queryRunner.query("CREATE UNIQUE INDEX `REL_d2605807496ad103e5fa534223` ON `s_prospect_configs` (`company_id`)");
    await queryRunner.query("ALTER TABLE `s_prospect_configs` ADD CONSTRAINT `FK_d2605807496ad103e5fa534223b` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
  }

}
