import { MigrationInterface, QueryRunner } from "typeorm";

export class refreshForeignKeys1679046472489 implements MigrationInterface {
    name = 'refreshForeignKeys1679046472489'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`s_company_conditions\` DROP FOREIGN KEY \`FK_82cfd13319a212625e508cb026c\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_update_histories\` DROP FOREIGN KEY \`FK_ddfae091efe3d48836ffe558560\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_users\` DROP FOREIGN KEY \`FK_1a382f881da27a070205677099f\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_users\` DROP FOREIGN KEY \`FK_aec5d613b8a2bba3e2834713365\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_sections\` DROP FOREIGN KEY \`FK_10c84d07ac8e4247465c6e8e46a\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_sections\` DROP FOREIGN KEY \`FK_46b78aa9cdad0aa3c0f47a0cfb8\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_histories\` DROP FOREIGN KEY \`FK_bc2306e4d414b4eb8234fd0ef93\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_histories\` DROP FOREIGN KEY \`FK_dfbb51f713070fde65981ea3dd6\``);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` DROP FOREIGN KEY \`FK_19e1a61850b24fe8a13a9b4d171\``);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` DROP FOREIGN KEY \`FK_34cd453f727ade2851681dc0851\``);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` DROP FOREIGN KEY \`FK_cc6685ef8b6070cb93ee631310d\``);
        await queryRunner.query(`ALTER TABLE \`t_todos\` DROP FOREIGN KEY \`FK_00d7d5ab26f415f0745417dd4d3\``);
        await queryRunner.query(`ALTER TABLE \`t_todos\` DROP FOREIGN KEY \`FK_dc52f169de9167b7d13ed86d08f\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP FOREIGN KEY \`FK_0643af4c605a5300c9246219e84\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP FOREIGN KEY \`FK_f7aa29458db9cdf319616a8a7ef\``);
        await queryRunner.query(`ALTER TABLE \`s_todo_app_users\` DROP FOREIGN KEY \`FK_06379bc9d1e2038db60a530013c\``);
        await queryRunner.query(`ALTER TABLE \`s_todo_app_users\` DROP FOREIGN KEY \`FK_47d0aa465190d3960230313b6ad\``);
        await queryRunner.query(`ALTER TABLE \`s_options\` DROP FOREIGN KEY \`FK_46cfb0bda78e7f6c82f664f5612\``);
        await queryRunner.query(`ALTER TABLE \`s_property_options\` DROP FOREIGN KEY \`FK_2244344c11f1195f41745a8fe8e\``);
        await queryRunner.query(`ALTER TABLE \`s_property_options\` DROP FOREIGN KEY \`FK_dd6aa46bc6d87ee2538817d7129\``);
        await queryRunner.query(`ALTER TABLE \`s_properties\` DROP FOREIGN KEY \`FK_84ab42f4fb3d8c1664c6c13e313\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP FOREIGN KEY \`FK_03b88a97a4e616464ffaed4c272\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP FOREIGN KEY \`FK_0b16e5d0a447cd2ac75e6dfe044\``);
        await queryRunner.query(`ALTER TABLE \`s_chat_tool_users\` DROP FOREIGN KEY \`FK_47a0ec2029b78a6763d92101b6a\``);
        await queryRunner.query(`ALTER TABLE \`s_chat_tool_users\` DROP FOREIGN KEY \`FK_f8f2b91512e8764ce8c354ff408\``);
        await queryRunner.query(`ALTER TABLE \`s_sections\` DROP FOREIGN KEY \`FK_1c0bfa8097263834f1ee123f4c2\``);
        await queryRunner.query(`ALTER TABLE \`s_sections\` DROP FOREIGN KEY \`FK_4d92452c9612ab582677cab1946\``);
        await queryRunner.query(`ALTER TABLE \`s_sections\` DROP FOREIGN KEY \`FK_9692e8539317d6ae89cfcedd21e\``);
        await queryRunner.query(`ALTER TABLE \`s_document_tool_users\` DROP FOREIGN KEY \`FK_0b7427b46ef53d6f7672e0a82cb\``);
        await queryRunner.query(`ALTER TABLE \`s_document_tool_users\` DROP FOREIGN KEY \`FK_bee610f6aacd974d35af8d34ab8\``);
        await queryRunner.query(`ALTER TABLE \`s_users\` DROP FOREIGN KEY \`FK_7ae6334059289559722437bcc1c\``);
        await queryRunner.query(`ALTER TABLE \`s_companies\` DROP FOREIGN KEY \`FK_d8c5ee51b5be0550962a5fb95ae\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_document_tools\` DROP FOREIGN KEY \`FK_0c60fbc026be09d4a6065ea7f5a\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_document_tools\` DROP FOREIGN KEY \`FK_cca5885c8f7c3ca5087f305ffb6\``);
        await queryRunner.query(`ALTER TABLE \`t_messages\` DROP FOREIGN KEY \`FK_66fd0b962f352df94a0916a7153\``);
        await queryRunner.query(`ALTER TABLE \`t_messages\` DROP FOREIGN KEY \`FK_830a3c1d92614d1495418c46736\``);
        await queryRunner.query(`ALTER TABLE \`t_messages\` DROP FOREIGN KEY \`FK_bddc671662390b17a2df6815075\``);
        await queryRunner.query(`ALTER TABLE \`t_messages\` DROP FOREIGN KEY \`FK_d9f251c27b8d48c196d8946a419\``);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` DROP FOREIGN KEY \`FK_4154291725b583001e8ef892a9d\``);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` DROP FOREIGN KEY \`FK_ab3eaead33ae9b70efba9bbf95a\``);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` DROP FOREIGN KEY \`FK_df8d608ee34ce8816a96a805022\``);
        await queryRunner.query(`ALTER TABLE \`t_remind_user_jobs\` DROP FOREIGN KEY \`FK_63db03d83b05fc0432e206a0f1b\``);
        await queryRunner.query(`ALTER TABLE \`t_daily_reports\` DROP FOREIGN KEY \`FK_5bc9073f7de177a46352701adeb\``);
        await queryRunner.query(`ALTER TABLE \`t_daily_reports\` DROP FOREIGN KEY \`FK_d260f5edfb269aa9b85b906ba25\``);
        await queryRunner.query(`DROP INDEX \`IDX_df8d608ee34ce8816a96a80502\` ON \`t_line_message_queues\``);
        await queryRunner.query(`DROP INDEX \`REL_df8d608ee34ce8816a96a80502\` ON \`t_line_message_queues\``);
        await queryRunner.query(`ALTER TABLE \`s_properties\` DROP COLUMN \`usage\``);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` ADD UNIQUE INDEX \`IDX_392dab9b1e396a8b68faf36227\` (\`message_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_392dab9b1e396a8b68faf36227\` ON \`t_line_message_queues\` (\`message_id\`)`);
        await queryRunner.query(`ALTER TABLE \`s_company_conditions\` ADD CONSTRAINT \`FK_9c7b4af16ef98a65b9f03d088bd\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_update_histories\` ADD CONSTRAINT \`FK_f460679887cd3136eecec4abde2\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_users\` ADD CONSTRAINT \`FK_ecaa1edde79878c9d6dd04358e7\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_users\` ADD CONSTRAINT \`FK_67a9e38e43f6bcf5d8f84869ab6\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_sections\` ADD CONSTRAINT \`FK_ddee1bca012de86f73219589c09\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_sections\` ADD CONSTRAINT \`FK_c6d423abff900391f2230484587\` FOREIGN KEY (\`section_id\`) REFERENCES \`s_sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_histories\` ADD CONSTRAINT \`FK_8b4aa7b9c907bda34b461a2bb4f\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_histories\` ADD CONSTRAINT \`FK_7d4f310d5eb874d821aa7bbedcf\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` ADD CONSTRAINT \`FK_fdb17657c73b5235bf09e579fa0\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` ADD CONSTRAINT \`FK_04ead2262b8da734ea906892626\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` ADD CONSTRAINT \`FK_ea4787053b471eea6bfd646fe52\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todos\` ADD CONSTRAINT \`FK_e6d29a898f252a0e868c667cfb2\` FOREIGN KEY (\`todoapp_id\`) REFERENCES \`m_todo_apps\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todos\` ADD CONSTRAINT \`FK_062ff0349a54ef32b5939c86046\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD CONSTRAINT \`FK_64e0b06ca3acaa5a05f3e96c7fb\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD CONSTRAINT \`FK_8f8659902f43cde9bd96840182a\` FOREIGN KEY (\`todoapp_id\`) REFERENCES \`m_todo_apps\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_todo_app_users\` ADD CONSTRAINT \`FK_9aae6b00c529293dab86f4bc170\` FOREIGN KEY (\`employee_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_todo_app_users\` ADD CONSTRAINT \`FK_7aef6788233a9459b13140f6dc3\` FOREIGN KEY (\`todoapp_id\`) REFERENCES \`m_todo_apps\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_options\` ADD CONSTRAINT \`FK_8edcd1b02f830a90ab4c1097beb\` FOREIGN KEY (\`property_id\`) REFERENCES \`s_properties\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_property_options\` ADD CONSTRAINT \`FK_677e9e0ddda120524b97d914c33\` FOREIGN KEY (\`property_id\`) REFERENCES \`s_properties\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_property_options\` ADD CONSTRAINT \`FK_7ec8e9e8b05064951246d5c314a\` FOREIGN KEY (\`option_id\`) REFERENCES \`s_options\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_properties\` ADD CONSTRAINT \`FK_625e3251db6578d0669066d7d7d\` FOREIGN KEY (\`section_id\`) REFERENCES \`s_sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD CONSTRAINT \`FK_f441ddd65b1a0af800c867d0809\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD CONSTRAINT \`FK_b93fcfa79efe6ac0dee6f055480\` FOREIGN KEY (\`chattool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_chat_tool_users\` ADD CONSTRAINT \`FK_c0fb40df28f96fa6e02c369e123\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_chat_tool_users\` ADD CONSTRAINT \`FK_e85b01aa3042ee8eb68b720e2aa\` FOREIGN KEY (\`chattool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` ADD CONSTRAINT \`FK_df6f227ff329e9e4c3903eec360\` FOREIGN KEY (\`document_tool_id\`) REFERENCES \`m_document_tools\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_sections\` ADD CONSTRAINT \`FK_f9d92ec5301ff43927e542c4c59\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_sections\` ADD CONSTRAINT \`FK_76d67a4e04c73bbaefe711338c5\` FOREIGN KEY (\`todoapp_id\`) REFERENCES \`m_todo_apps\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_sections\` ADD CONSTRAINT \`FK_1980a9850b4789a8c35a8eb9558\` FOREIGN KEY (\`board_admin_user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_document_tool_users\` ADD CONSTRAINT \`FK_fd9f21b083268aab73fa100a7b4\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_document_tool_users\` ADD CONSTRAINT \`FK_dd4aa14e3a230210ed39503c6b5\` FOREIGN KEY (\`document_tool_id\`) REFERENCES \`m_document_tools\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_users\` ADD CONSTRAINT \`FK_2c82db53b5788ef6e1623ef67a5\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_companies\` ADD CONSTRAINT \`FK_30cd7ab882f7576be3a536a1613\` FOREIGN KEY (\`admin_user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_document_tools\` ADD CONSTRAINT \`FK_555cdebff2c6de3b16c3a32efd5\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_document_tools\` ADD CONSTRAINT \`FK_c7b36793e041be6f670584b3dd6\` FOREIGN KEY (\`document_tool_id\`) REFERENCES \`m_document_tools\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_messages\` ADD CONSTRAINT \`FK_809c35b2d36c9cecdd658b79a3c\` FOREIGN KEY (\`message_type_id\`) REFERENCES \`m_message_types\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_messages\` ADD CONSTRAINT \`FK_00340d4b848d0429dd7dddfafaf\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_messages\` ADD CONSTRAINT \`FK_7a28836ba0ef876d22fcb8a0a30\` FOREIGN KEY (\`chattool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_messages\` ADD CONSTRAINT \`FK_67f432b8ee96a12c69fff062b09\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` ADD CONSTRAINT \`FK_9fd8eaf0f08c59aec23fbbe89f1\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` ADD CONSTRAINT \`FK_e4a87028af80386eddf5376b0eb\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` ADD CONSTRAINT \`FK_392dab9b1e396a8b68faf362270\` FOREIGN KEY (\`message_id\`) REFERENCES \`t_messages\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_remind_user_jobs\` ADD CONSTRAINT \`FK_84973a255249938596523b6f1c4\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_daily_reports\` ADD CONSTRAINT \`FK_1eb871493cc275d83a86ab06237\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_daily_reports\` ADD CONSTRAINT \`FK_c5a2626427bed35e128094d2e01\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`t_daily_reports\` DROP FOREIGN KEY \`FK_c5a2626427bed35e128094d2e01\``);
        await queryRunner.query(`ALTER TABLE \`t_daily_reports\` DROP FOREIGN KEY \`FK_1eb871493cc275d83a86ab06237\``);
        await queryRunner.query(`ALTER TABLE \`t_remind_user_jobs\` DROP FOREIGN KEY \`FK_84973a255249938596523b6f1c4\``);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` DROP FOREIGN KEY \`FK_392dab9b1e396a8b68faf362270\``);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` DROP FOREIGN KEY \`FK_e4a87028af80386eddf5376b0eb\``);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` DROP FOREIGN KEY \`FK_9fd8eaf0f08c59aec23fbbe89f1\``);
        await queryRunner.query(`ALTER TABLE \`t_messages\` DROP FOREIGN KEY \`FK_67f432b8ee96a12c69fff062b09\``);
        await queryRunner.query(`ALTER TABLE \`t_messages\` DROP FOREIGN KEY \`FK_7a28836ba0ef876d22fcb8a0a30\``);
        await queryRunner.query(`ALTER TABLE \`t_messages\` DROP FOREIGN KEY \`FK_00340d4b848d0429dd7dddfafaf\``);
        await queryRunner.query(`ALTER TABLE \`t_messages\` DROP FOREIGN KEY \`FK_809c35b2d36c9cecdd658b79a3c\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_document_tools\` DROP FOREIGN KEY \`FK_c7b36793e041be6f670584b3dd6\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_document_tools\` DROP FOREIGN KEY \`FK_555cdebff2c6de3b16c3a32efd5\``);
        await queryRunner.query(`ALTER TABLE \`s_companies\` DROP FOREIGN KEY \`FK_30cd7ab882f7576be3a536a1613\``);
        await queryRunner.query(`ALTER TABLE \`s_users\` DROP FOREIGN KEY \`FK_2c82db53b5788ef6e1623ef67a5\``);
        await queryRunner.query(`ALTER TABLE \`s_document_tool_users\` DROP FOREIGN KEY \`FK_dd4aa14e3a230210ed39503c6b5\``);
        await queryRunner.query(`ALTER TABLE \`s_document_tool_users\` DROP FOREIGN KEY \`FK_fd9f21b083268aab73fa100a7b4\``);
        await queryRunner.query(`ALTER TABLE \`s_sections\` DROP FOREIGN KEY \`FK_1980a9850b4789a8c35a8eb9558\``);
        await queryRunner.query(`ALTER TABLE \`s_sections\` DROP FOREIGN KEY \`FK_76d67a4e04c73bbaefe711338c5\``);
        await queryRunner.query(`ALTER TABLE \`s_sections\` DROP FOREIGN KEY \`FK_f9d92ec5301ff43927e542c4c59\``);
        await queryRunner.query(`ALTER TABLE \`s_daily_report_configs\` DROP FOREIGN KEY \`FK_df6f227ff329e9e4c3903eec360\``);
        await queryRunner.query(`ALTER TABLE \`s_chat_tool_users\` DROP FOREIGN KEY \`FK_e85b01aa3042ee8eb68b720e2aa\``);
        await queryRunner.query(`ALTER TABLE \`s_chat_tool_users\` DROP FOREIGN KEY \`FK_c0fb40df28f96fa6e02c369e123\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP FOREIGN KEY \`FK_b93fcfa79efe6ac0dee6f055480\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` DROP FOREIGN KEY \`FK_f441ddd65b1a0af800c867d0809\``);
        await queryRunner.query(`ALTER TABLE \`s_properties\` DROP FOREIGN KEY \`FK_625e3251db6578d0669066d7d7d\``);
        await queryRunner.query(`ALTER TABLE \`s_property_options\` DROP FOREIGN KEY \`FK_7ec8e9e8b05064951246d5c314a\``);
        await queryRunner.query(`ALTER TABLE \`s_property_options\` DROP FOREIGN KEY \`FK_677e9e0ddda120524b97d914c33\``);
        await queryRunner.query(`ALTER TABLE \`s_options\` DROP FOREIGN KEY \`FK_8edcd1b02f830a90ab4c1097beb\``);
        await queryRunner.query(`ALTER TABLE \`s_todo_app_users\` DROP FOREIGN KEY \`FK_7aef6788233a9459b13140f6dc3\``);
        await queryRunner.query(`ALTER TABLE \`s_todo_app_users\` DROP FOREIGN KEY \`FK_9aae6b00c529293dab86f4bc170\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP FOREIGN KEY \`FK_8f8659902f43cde9bd96840182a\``);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` DROP FOREIGN KEY \`FK_64e0b06ca3acaa5a05f3e96c7fb\``);
        await queryRunner.query(`ALTER TABLE \`t_todos\` DROP FOREIGN KEY \`FK_062ff0349a54ef32b5939c86046\``);
        await queryRunner.query(`ALTER TABLE \`t_todos\` DROP FOREIGN KEY \`FK_e6d29a898f252a0e868c667cfb2\``);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` DROP FOREIGN KEY \`FK_ea4787053b471eea6bfd646fe52\``);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` DROP FOREIGN KEY \`FK_04ead2262b8da734ea906892626\``);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` DROP FOREIGN KEY \`FK_fdb17657c73b5235bf09e579fa0\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_histories\` DROP FOREIGN KEY \`FK_7d4f310d5eb874d821aa7bbedcf\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_histories\` DROP FOREIGN KEY \`FK_8b4aa7b9c907bda34b461a2bb4f\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_sections\` DROP FOREIGN KEY \`FK_c6d423abff900391f2230484587\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_sections\` DROP FOREIGN KEY \`FK_ddee1bca012de86f73219589c09\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_users\` DROP FOREIGN KEY \`FK_67a9e38e43f6bcf5d8f84869ab6\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_users\` DROP FOREIGN KEY \`FK_ecaa1edde79878c9d6dd04358e7\``);
        await queryRunner.query(`ALTER TABLE \`t_todo_update_histories\` DROP FOREIGN KEY \`FK_f460679887cd3136eecec4abde2\``);
        await queryRunner.query(`ALTER TABLE \`s_company_conditions\` DROP FOREIGN KEY \`FK_9c7b4af16ef98a65b9f03d088bd\``);
        await queryRunner.query(`DROP INDEX \`REL_392dab9b1e396a8b68faf36227\` ON \`t_line_message_queues\``);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` DROP INDEX \`IDX_392dab9b1e396a8b68faf36227\``);
        await queryRunner.query(`ALTER TABLE \`s_properties\` ADD \`usage\` int NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_df8d608ee34ce8816a96a80502\` ON \`t_line_message_queues\` (\`message_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_df8d608ee34ce8816a96a80502\` ON \`t_line_message_queues\` (\`message_id\`)`);
        await queryRunner.query(`ALTER TABLE \`t_daily_reports\` ADD CONSTRAINT \`FK_d260f5edfb269aa9b85b906ba25\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_daily_reports\` ADD CONSTRAINT \`FK_5bc9073f7de177a46352701adeb\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_remind_user_jobs\` ADD CONSTRAINT \`FK_63db03d83b05fc0432e206a0f1b\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` ADD CONSTRAINT \`FK_df8d608ee34ce8816a96a805022\` FOREIGN KEY (\`message_id\`) REFERENCES \`t_messages\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` ADD CONSTRAINT \`FK_ab3eaead33ae9b70efba9bbf95a\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_line_message_queues\` ADD CONSTRAINT \`FK_4154291725b583001e8ef892a9d\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_messages\` ADD CONSTRAINT \`FK_d9f251c27b8d48c196d8946a419\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_messages\` ADD CONSTRAINT \`FK_bddc671662390b17a2df6815075\` FOREIGN KEY (\`message_type_id\`) REFERENCES \`m_message_types\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_messages\` ADD CONSTRAINT \`FK_830a3c1d92614d1495418c46736\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_messages\` ADD CONSTRAINT \`FK_66fd0b962f352df94a0916a7153\` FOREIGN KEY (\`chattool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_document_tools\` ADD CONSTRAINT \`FK_cca5885c8f7c3ca5087f305ffb6\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_document_tools\` ADD CONSTRAINT \`FK_0c60fbc026be09d4a6065ea7f5a\` FOREIGN KEY (\`document_tool_id\`) REFERENCES \`m_document_tools\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_companies\` ADD CONSTRAINT \`FK_d8c5ee51b5be0550962a5fb95ae\` FOREIGN KEY (\`admin_user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_users\` ADD CONSTRAINT \`FK_7ae6334059289559722437bcc1c\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_document_tool_users\` ADD CONSTRAINT \`FK_bee610f6aacd974d35af8d34ab8\` FOREIGN KEY (\`document_tool_id\`) REFERENCES \`m_document_tools\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_document_tool_users\` ADD CONSTRAINT \`FK_0b7427b46ef53d6f7672e0a82cb\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_sections\` ADD CONSTRAINT \`FK_9692e8539317d6ae89cfcedd21e\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_sections\` ADD CONSTRAINT \`FK_4d92452c9612ab582677cab1946\` FOREIGN KEY (\`todoapp_id\`) REFERENCES \`m_todo_apps\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_sections\` ADD CONSTRAINT \`FK_1c0bfa8097263834f1ee123f4c2\` FOREIGN KEY (\`board_admin_user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_chat_tool_users\` ADD CONSTRAINT \`FK_f8f2b91512e8764ce8c354ff408\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_chat_tool_users\` ADD CONSTRAINT \`FK_47a0ec2029b78a6763d92101b6a\` FOREIGN KEY (\`chattool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD CONSTRAINT \`FK_0b16e5d0a447cd2ac75e6dfe044\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_chat_tools\` ADD CONSTRAINT \`FK_03b88a97a4e616464ffaed4c272\` FOREIGN KEY (\`chattool_id\`) REFERENCES \`m_chat_tools\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_properties\` ADD CONSTRAINT \`FK_84ab42f4fb3d8c1664c6c13e313\` FOREIGN KEY (\`section_id\`) REFERENCES \`s_sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_property_options\` ADD CONSTRAINT \`FK_dd6aa46bc6d87ee2538817d7129\` FOREIGN KEY (\`property_id\`) REFERENCES \`s_properties\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_property_options\` ADD CONSTRAINT \`FK_2244344c11f1195f41745a8fe8e\` FOREIGN KEY (\`option_id\`) REFERENCES \`s_options\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_options\` ADD CONSTRAINT \`FK_46cfb0bda78e7f6c82f664f5612\` FOREIGN KEY (\`property_id\`) REFERENCES \`s_properties\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_todo_app_users\` ADD CONSTRAINT \`FK_47d0aa465190d3960230313b6ad\` FOREIGN KEY (\`employee_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_todo_app_users\` ADD CONSTRAINT \`FK_06379bc9d1e2038db60a530013c\` FOREIGN KEY (\`todoapp_id\`) REFERENCES \`m_todo_apps\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD CONSTRAINT \`FK_f7aa29458db9cdf319616a8a7ef\` FOREIGN KEY (\`todoapp_id\`) REFERENCES \`m_todo_apps\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_implemented_todo_apps\` ADD CONSTRAINT \`FK_0643af4c605a5300c9246219e84\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todos\` ADD CONSTRAINT \`FK_dc52f169de9167b7d13ed86d08f\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todos\` ADD CONSTRAINT \`FK_00d7d5ab26f415f0745417dd4d3\` FOREIGN KEY (\`todoapp_id\`) REFERENCES \`m_todo_apps\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` ADD CONSTRAINT \`FK_cc6685ef8b6070cb93ee631310d\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` ADD CONSTRAINT \`FK_34cd453f727ade2851681dc0851\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_prospects\` ADD CONSTRAINT \`FK_19e1a61850b24fe8a13a9b4d171\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_histories\` ADD CONSTRAINT \`FK_dfbb51f713070fde65981ea3dd6\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_histories\` ADD CONSTRAINT \`FK_bc2306e4d414b4eb8234fd0ef93\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_sections\` ADD CONSTRAINT \`FK_46b78aa9cdad0aa3c0f47a0cfb8\` FOREIGN KEY (\`section_id\`) REFERENCES \`s_sections\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_sections\` ADD CONSTRAINT \`FK_10c84d07ac8e4247465c6e8e46a\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_users\` ADD CONSTRAINT \`FK_aec5d613b8a2bba3e2834713365\` FOREIGN KEY (\`user_id\`) REFERENCES \`s_users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_users\` ADD CONSTRAINT \`FK_1a382f881da27a070205677099f\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`t_todo_update_histories\` ADD CONSTRAINT \`FK_ddfae091efe3d48836ffe558560\` FOREIGN KEY (\`todo_id\`) REFERENCES \`t_todos\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`s_company_conditions\` ADD CONSTRAINT \`FK_82cfd13319a212625e508cb026c\` FOREIGN KEY (\`company_id\`) REFERENCES \`s_companies\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
    }

}
