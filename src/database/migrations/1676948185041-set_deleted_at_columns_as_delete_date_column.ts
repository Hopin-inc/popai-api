import { MigrationInterface, QueryRunner } from "typeorm";

export class setDeletedAtColumnsAsDeleteDateColumn1676948185041 implements MigrationInterface {
    name = 'setDeletedAtColumnsAsDeleteDateColumn1676948185041'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`m_company_conditions\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_update_histories\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_users\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_sections\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_histories\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`prospects\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`todos\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`implemented_todo_apps\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_app_users\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`m_todo_apps\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`section_labels\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`sections\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`chat_tool_users\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`m_event_timings\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`companies\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`implemented_chat_tools\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`m_chat_tools\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`m_message_types\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`messages\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`column_names\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`daily_reports\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`line_message_queues\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`line_profiles\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`remind_user_jobs\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`reporting_lines\` CHANGE \`deleted_at\` \`deleted_at\` datetime(6) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reporting_lines\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`remind_user_jobs\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`line_profiles\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`line_message_queues\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`daily_reports\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`column_names\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`messages\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`m_message_types\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`m_chat_tools\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`implemented_chat_tools\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`companies\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`m_event_timings\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`chat_tool_users\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`sections\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`section_labels\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`m_todo_apps\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_app_users\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`implemented_todo_apps\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`todos\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`prospects\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_histories\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_sections\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_users\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`todo_update_histories\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`m_company_conditions\` CHANGE \`deleted_at\` \`deleted_at\` datetime(0) NULL`);
    }

}
