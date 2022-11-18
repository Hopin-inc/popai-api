import { MigrationInterface, QueryRunner } from 'typeorm';

export class addMessageIdToQueueTable1668576825352 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE line_message_queues ADD message_id INT NULL`);

    await queryRunner.query(
      `ALTER TABLE line_message_queues ADD CONSTRAINT line_message_queues_message_id_index FOREIGN KEY (message_id) REFERENCES messages (id)  ON DELETE SET NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE line_message_queues DROP FOREIGN KEY line_message_queues_message_id_index`
    );
    await queryRunner.query(`ALTER TABLE line_message_queues DROP COLUMN message_id`);
  }
}
