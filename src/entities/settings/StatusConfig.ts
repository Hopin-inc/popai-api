import { JoinColumn, OneToOne } from "typeorm";
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "./Company";

type ConstructorOption = {
    company: Company | string;
    level1: string,
    level2: string,
    level3: string,
    level4: string,
    level5: string,
};

@Entity("s_status_config")
export default class StatusConfig extends BaseEntity {
    constructor(options: ConstructorOption) {
        super();
        if (options) {
          const { company, ...rest } = options;
          this.companyId = typeof company === "string" ? company : company.id;
          Object.assign(this, { ...this, ...rest });
        }
    }
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "company_id" })
    companyId: string;

    @OneToOne(
        () => Company,
        company => company.setupConfig,
        { onDelete: "CASCADE", onUpdate: "RESTRICT" },
    )
    @JoinColumn({ name: "company_id" })
    company: Company;

    @Column({ type: "varchar", length: 255, nullable: true })
    level1: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    level2: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    level3: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    level4: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    level5: string;
}
