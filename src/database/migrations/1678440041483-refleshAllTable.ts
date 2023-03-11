import { MigrationInterface, QueryRunner } from "typeorm";

export class refleshAllTable1678440041483 implements MigrationInterface {
  name = "refleshAllTable1678440041483";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE `column_names`");
    await queryRunner.query("DROP TABLE `line_profiles`");
    await queryRunner.query("DROP TABLE `section_labels`");
    await queryRunner.query("ALTER TABLE `chat_tool_users` RENAME TO `s_chat_tool_users`");
    await queryRunner.query("ALTER TABLE `companies` RENAME TO `s_companies`");
    await queryRunner.query("ALTER TABLE `m_company_conditions` RENAME TO `s_company_conditions`");
    await queryRunner.query("ALTER TABLE `document_tool_users` RENAME TO `s_document_tool_users`");
    await queryRunner.query("ALTER TABLE `implemented_chat_tools` RENAME TO `s_implemented_chat_tools`");
    await queryRunner.query("ALTER TABLE `implemented_document_tools` RENAME TO `s_implemented_document_tools`");
    await queryRunner.query("ALTER TABLE `implemented_todo_apps` RENAME TO `s_implemented_todo_apps`");
    await queryRunner.query("ALTER TABLE `reporting_lines` RENAME TO `s_reporting_lines`");
    await queryRunner.query("ALTER TABLE `sections` RENAME TO `s_sections`");
    await queryRunner.query("ALTER TABLE `todo_app_users` RENAME TO `s_todo_app_users`");
    await queryRunner.query("ALTER TABLE `users` RENAME TO `s_users`");

    await queryRunner.query("ALTER TABLE `messages` RENAME TO `t_messages`");
    await queryRunner.query("ALTER TABLE `daily_reports` RENAME TO `t_daily_reports`");
    await queryRunner.query("ALTER TABLE `line_message_queues` RENAME TO `t_line_message_queues`");
    await queryRunner.query("ALTER TABLE `prospects` RENAME TO `t_prospects`");
    await queryRunner.query("ALTER TABLE `remind_user_jobs` RENAME TO `t_remind_user_jobs`");
    await queryRunner.query("ALTER TABLE `todos` RENAME TO `t_todos`");
    await queryRunner.query("ALTER TABLE `todo_histories` RENAME TO `t_todo_histories`");
    await queryRunner.query("ALTER TABLE `todo_sections` RENAME TO `t_todo_sections`");
    await queryRunner.query("ALTER TABLE `todo_update_histories` RENAME TO `t_todo_update_histories`");
    await queryRunner.query("ALTER TABLE `todo_users` RENAME TO `t_todo_users`");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `s_chat_tool_users` RENAME TO `chat_tool_users`");
    await queryRunner.query("ALTER TABLE `s_companies` RENAME TO `companies`");
    await queryRunner.query("ALTER TABLE `s_company_conditions` RENAME TO `company_conditions`");
    await queryRunner.query("ALTER TABLE `s_document_tool_users` RENAME TO `document_tool_users`");
    await queryRunner.query("ALTER TABLE `s_implemented_chat_tools` RENAME TO `implemented_chat_tools`");
    await queryRunner.query("ALTER TABLE `s_implemented_document_tools` RENAME TO `implemented_document_tools`");
    await queryRunner.query("ALTER TABLE `s_implemented_todo_apps` RENAME TO `implemented_todo_apps`");
    await queryRunner.query("ALTER TABLE `s_reporting_lines` RENAME TO `reporting_lines`");
    await queryRunner.query("ALTER TABLE `s_sections` RENAME TO `sections`");
    await queryRunner.query("ALTER TABLE `s_todo_app_users` RENAME TO `todo_app_users`");
    await queryRunner.query("ALTER TABLE `s_users` RENAME TO `users`");

    await queryRunner.query("ALTER TABLE `t_messages` RENAME TO `messages`");
    await queryRunner.query("ALTER TABLE `t_daily_reports` RENAME TO `daily_reports`");
    await queryRunner.query("ALTER TABLE `t_line_message_queues` RENAME TO `line_message_queues`");
    await queryRunner.query("ALTER TABLE `t_prospects` RENAME TO `prospects`");
    await queryRunner.query("ALTER TABLE `t_remind_user_jobs` RENAME TO `remind_user_jobs`");
    await queryRunner.query("ALTER TABLE `t_todos` RENAME TO `todos`");
    await queryRunner.query("ALTER TABLE `t_todo_histories` RENAME TO `todo_histories`");
    await queryRunner.query("ALTER TABLE `t_todo_sections` RENAME TO `todo_sections`");
    await queryRunner.query("ALTER TABLE `t_todo_update_histories` RENAME TO `todo_update_histories`");
    await queryRunner.query("ALTER TABLE `t_todo_users` RENAME TO `todo_users`");
  }
}
