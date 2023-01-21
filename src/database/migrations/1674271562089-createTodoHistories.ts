import { MigrationInterface, QueryRunner } from "typeorm";

export class createTodoHistories1674271562089 implements MigrationInterface {
  name = "createTodoHistories1674271562089";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`todo_histories\`
                             (
                                 \`created_at\`             datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP (6),
                                 \`updated_at\`             datetime NULL ON UPDATE CURRENT_TIMESTAMP,
                                 \`deleted_at\`             datetime NULL,
                                 \`id\`                     int      NOT NULL AUTO_INCREMENT,
                                 \`todo_id\`                int      NOT NULL,
                                 \`property\`               int      NOT NULL,
                                 \`action\`                 int      NOT NULL,
                                 \`deadline\`               datetime NULL,
                                 \`user_id\`                int NULL,
                                 \`days_diff\`              int NULL,
                                 \`todoapp_reg_updated_at\` datetime NOT NULL,
                                 PRIMARY KEY (\`id\`)
                             ) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`todo_histories\`
        ADD CONSTRAINT \`FK_dfbb51f713070fde65981ea3dd6\` FOREIGN KEY (\`todo_id\`) REFERENCES \`todos\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    await queryRunner.query(`ALTER TABLE \`todo_histories\`
        ADD CONSTRAINT \`FK_bc2306e4d414b4eb8234fd0ef93\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`todo_histories\` DROP FOREIGN KEY \`FK_bc2306e4d414b4eb8234fd0ef93\``);
    await queryRunner.query(`ALTER TABLE \`todo_histories\` DROP FOREIGN KEY \`FK_dfbb51f713070fde65981ea3dd6\``);
    await queryRunner.query(`DROP TABLE \`todo_histories\``);
  }

}
