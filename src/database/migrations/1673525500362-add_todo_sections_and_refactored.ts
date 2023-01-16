import { MigrationInterface, QueryRunner } from "typeorm";

export class addTodoSectionsAndRefactored1673525500362 implements MigrationInterface {
    name = 'addTodoSectionsAndRefactored1673525500362'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_df8d608ee34ce8816a96a80502\` ON \`line_message_queues\``);
        await queryRunner.query(`ALTER TABLE \`chat_tool_users\` ADD CONSTRAINT \`FK_f8f2b91512e8764ce8c354ff408\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`chat_tool_users\` ADD CONSTRAINT \`FK_47a0ec2029b78a6763d92101b6a\` FOREIGN KEY (\`chattool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_7ae6334059289559722437bcc1c\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`companies\` ADD CONSTRAINT \`FK_d8c5ee51b5be0550962a5fb95ae\` FOREIGN KEY (\`admin_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_bddc671662390b17a2df6815075\` FOREIGN KEY (\`message_type_id\`) REFERENCES \`m_message_types\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_830a3c1d92614d1495418c46736\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_66fd0b962f352df94a0916a7153\` FOREIGN KEY (\`chattool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_d9f251c27b8d48c196d8946a419\` FOREIGN KEY (\`todo_id\`) REFERENCES \`todos\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`line_message_queues\` ADD CONSTRAINT \`FK_4154291725b583001e8ef892a9d\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`line_message_queues\` ADD CONSTRAINT \`FK_ab3eaead33ae9b70efba9bbf95a\` FOREIGN KEY (\`todo_id\`) REFERENCES \`todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`line_message_queues\` ADD CONSTRAINT \`FK_df8d608ee34ce8816a96a805022\` FOREIGN KEY (\`message_id\`) REFERENCES \`messages\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`remind_user_jobs\` ADD CONSTRAINT \`FK_63db03d83b05fc0432e206a0f1b\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`remind_user_jobs\` DROP FOREIGN KEY \`FK_63db03d83b05fc0432e206a0f1b\``);
        await queryRunner.query(`ALTER TABLE \`line_message_queues\` DROP FOREIGN KEY \`FK_df8d608ee34ce8816a96a805022\``);
        await queryRunner.query(`ALTER TABLE \`line_message_queues\` DROP FOREIGN KEY \`FK_ab3eaead33ae9b70efba9bbf95a\``);
        await queryRunner.query(`ALTER TABLE \`line_message_queues\` DROP FOREIGN KEY \`FK_4154291725b583001e8ef892a9d\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_d9f251c27b8d48c196d8946a419\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_66fd0b962f352df94a0916a7153\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_830a3c1d92614d1495418c46736\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_bddc671662390b17a2df6815075\``);
        await queryRunner.query(`ALTER TABLE \`companies\` DROP FOREIGN KEY \`FK_d8c5ee51b5be0550962a5fb95ae\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_7ae6334059289559722437bcc1c\``);
        await queryRunner.query(`ALTER TABLE \`chat_tool_users\` DROP FOREIGN KEY \`FK_47a0ec2029b78a6763d92101b6a\``);
        await queryRunner.query(`ALTER TABLE \`chat_tool_users\` DROP FOREIGN KEY \`FK_f8f2b91512e8764ce8c354ff408\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_df8d608ee34ce8816a96a80502\` ON \`line_message_queues\` (\`message_id\`)`);
    }

}
