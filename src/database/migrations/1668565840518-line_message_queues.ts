import { MigrationInterface, QueryRunner } from 'typeorm';

export class lineMessageQueues1668565840518 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE line_message_queues (
          id INT NOT NULL AUTO_INCREMENT,
          todo_id INT NULL,
          user_id INT NULL,
          status TINYINT(1) DEFAULT 0,
          remind_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY(id),
          CONSTRAINT line_message_queues_todo_id_user_id_status__remind_date_index UNIQUE (todo_id,user_id,status,remind_date),
          
          FOREIGN KEY (todo_id) REFERENCES todos (id)  ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)  ON DELETE SET NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('line_message_queues');
  }
}
