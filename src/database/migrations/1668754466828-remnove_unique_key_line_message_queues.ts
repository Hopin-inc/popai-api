import { MigrationInterface, QueryRunner } from 'typeorm';

export class remnoveUniqueKeyLineMessageQueues1668754466828 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE line_message_queues DROP FOREIGN KEY line_message_queues_ibfk_1`
    );

    await queryRunner.query(
      `ALTER TABLE line_message_queues DROP FOREIGN KEY line_message_queues_ibfk_2`
    );

    await queryRunner.query(
      `ALTER TABLE line_message_queues DROP INDEX line_message_queues_todo_id_user_id_status__remind_date_index`
    );

    await queryRunner.query(
      `ALTER TABLE line_message_queues ADD FOREIGN KEY (todo_id) REFERENCES todos (id)  ON DELETE SET NULL`
    );

    await queryRunner.query(
      `ALTER TABLE line_message_queues ADD FOREIGN KEY (user_id) REFERENCES users (id)  ON DELETE SET NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE line_message_queues 
        ADD CONSTRAINT line_message_queues_todo_id_user_id_status__remind_date_index UNIQUE (todo_id,user_id,status,remind_date)`);
  }

  // line_message_queues_todo_id_user_id_status__remind_date_index
}
