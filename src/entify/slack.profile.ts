import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('slack_profiles')
export class SlackProfile {
  @PrimaryColumn()
  slack_id: string;

  @Column()
  display_name: string;

  @Column()
  picture_url: string;
}
