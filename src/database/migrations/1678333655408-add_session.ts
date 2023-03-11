import { MigrationInterface, QueryRunner } from "typeorm";

export class addSession1678333655408 implements MigrationInterface {
    name = 'addSession1678333655408'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`t_sessions\` (\`id\` varchar(255) COLLATE "utf8mb4_unicode_ci" NOT NULL, \`expired_at\` bigint NOT NULL, \`json\` text NOT NULL, \`destroyed_at\` datetime(6) NULL, INDEX \`IDX_67fa4b92e3078feb4400ab9a4f\` (\`expired_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`t_sessions\``);
    }

}
