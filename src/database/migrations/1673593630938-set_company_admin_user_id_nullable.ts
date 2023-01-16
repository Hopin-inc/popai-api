import { MigrationInterface, QueryRunner } from "typeorm";

export class setCompanyAdminUserIdNullable1673593630938 implements MigrationInterface {
    name = 'setCompanyAdminUserIdNullable1673593630938'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`companies\` DROP FOREIGN KEY \`FK_d8c5ee51b5be0550962a5fb95ae\``);
        await queryRunner.query(`ALTER TABLE \`companies\` CHANGE \`admin_user_id\` \`admin_user_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`companies\` ADD CONSTRAINT \`FK_d8c5ee51b5be0550962a5fb95ae\` FOREIGN KEY (\`admin_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`companies\` DROP FOREIGN KEY \`FK_d8c5ee51b5be0550962a5fb95ae\``);
        await queryRunner.query(`ALTER TABLE \`companies\` CHANGE \`admin_user_id\` \`admin_user_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`companies\` ADD CONSTRAINT \`FK_d8c5ee51b5be0550962a5fb95ae\` FOREIGN KEY (\`admin_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
    }

}
