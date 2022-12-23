import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("line_profiles")
export class LineProfile {
  @PrimaryColumn()
  line_id: string;

  @Column()
  display_name: string;

  @Column()
  picture_url: string;

  @Column()
  status_message: string;
}
