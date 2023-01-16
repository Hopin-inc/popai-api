import { MigrationInterface, QueryRunner } from "typeorm";

export class renameSectionLabels1673600219863 implements MigrationInterface {
    name = 'renameSectionLabels1673600219863'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`column_names\` CHANGE \`board_id\` \`section_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`column_names\` ADD UNIQUE INDEX \`IDX_732dfbc7e428de453d1189c464\` (\`section_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_732dfbc7e428de453d1189c464\` ON \`column_names\` (\`section_id\`)`);
        await queryRunner.query(`ALTER TABLE \`column_names\` ADD CONSTRAINT \`FK_732dfbc7e428de453d1189c464d\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`labels\` RENAME \`section_labels\``);
        await queryRunner.query(`ALTER TABLE \`labels\` CHANGE \`board_id\` \`section_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`section_labels\` ADD CONSTRAINT \`FK_e7566dddb9af62f46aeec4bbd3a\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`column_names\` DROP FOREIGN KEY \`FK_732dfbc7e428de453d1189c464d\``);
        await queryRunner.query(`ALTER TABLE \`section_labels\` DROP FOREIGN KEY \`FK_e7566dddb9af62f46aeec4bbd3a\``);
        await queryRunner.query(`DROP INDEX \`REL_732dfbc7e428de453d1189c464\` ON \`column_names\``);
        await queryRunner.query(`ALTER TABLE \`column_names\` DROP INDEX \`IDX_732dfbc7e428de453d1189c464\``);
        await queryRunner.query(`ALTER TABLE \`column_names\` CHANGE \`section_id\` \`board_id\` int NOT NULL`);
        await queryRunner.query(`DROP INDEX \`REL_e7566dddb9af62f46aeec4bbd3\` ON \`section_labels\``);
        await queryRunner.query(`ALTER TABLE \`section_labels\` CHANGE \`section_id\` \`board_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`section_labels\` RENAME \`labels\``);
    }

}
