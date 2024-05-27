import { MigrationInterface, QueryRunner } from "typeorm";

export class sStatusConfig1716372362564 implements MigrationInterface {
    name = "statusConfig1716372362564";

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query("CREATE TABLE `s_status_config` (`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime NULL ON UPDATE CURRENT_TIMESTAMP, `deleted_at` datetime(6) NULL, `id` int NOT NULL AUTO_INCREMENT, `company_id` varchar(255) NOT NULL, `level1` varchar(255) NOT NULL, `level2` varchar(255) NOT NULL, `level3` varchar(255) NOT NULL , `level4` varchar(255) NOT NULL, `level5` varchar(255) NOT NULL, UNIQUE INDEX `REL_p3M6bR7j8ZOnj4KQMINypMdp4Ih1` (`company_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB;");  
      await queryRunner.query("ALTER TABLE `s_status_config` ADD CONSTRAINT `FK_p3M6bR7j8ZOnj4KQMINypMdp4Ih1` FOREIGN KEY (`company_id`) REFERENCES `s_companies`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query("ALTER TABLE `s_status_config` DROP FOREIGN KEY `FK_p3M6bR7j8ZOnj4KQMINypMdp4Ih1`");
      await queryRunner.query("DROP TABLE `s_status_config`");
    }
}
