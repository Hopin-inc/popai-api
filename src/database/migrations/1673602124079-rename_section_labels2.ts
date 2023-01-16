import { MigrationInterface, QueryRunner } from "typeorm";

export class renameSectionLabels21673602124079 implements MigrationInterface {
    name = 'renameSectionLabels21673602124079'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`section_labels\` DROP FOREIGN KEY \`FK_8c01957f89bcb4364bb5b4b35ce\``);
        await queryRunner.query(`DROP INDEX \`REL_8c01957f89bcb4364bb5b4b35c\` ON \`section_labels\``);
        await queryRunner.query(`DROP INDEX \`IDX_732dfbc7e428de453d1189c464\` ON \`column_names\``);
        await queryRunner.query(`ALTER TABLE \`section_labels\` CHANGE \`board_id\` \`section_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`section_labels\` ADD UNIQUE INDEX \`IDX_e7566dddb9af62f46aeec4bbd3\` (\`section_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_e7566dddb9af62f46aeec4bbd3\` ON \`section_labels\` (\`section_id\`)`);
        await queryRunner.query(`ALTER TABLE \`section_labels\` ADD CONSTRAINT \`FK_e7566dddb9af62f46aeec4bbd3a\` FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`section_labels\` DROP FOREIGN KEY \`FK_e7566dddb9af62f46aeec4bbd3a\``);
        await queryRunner.query(`DROP INDEX \`REL_e7566dddb9af62f46aeec4bbd3\` ON \`section_labels\``);
        await queryRunner.query(`ALTER TABLE \`section_labels\` DROP INDEX \`IDX_e7566dddb9af62f46aeec4bbd3\``);
        await queryRunner.query(`ALTER TABLE \`section_labels\` CHANGE \`section_id\` \`board_id\` int NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_732dfbc7e428de453d1189c464\` ON \`column_names\` (\`section_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_8c01957f89bcb4364bb5b4b35c\` ON \`section_labels\` (\`board_id\`)`);
        await queryRunner.query(`ALTER TABLE \`section_labels\` ADD CONSTRAINT \`FK_8c01957f89bcb4364bb5b4b35ce\` FOREIGN KEY (\`board_id\`) REFERENCES \`sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

}
