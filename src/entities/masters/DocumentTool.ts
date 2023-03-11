import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "../settings/Company";
import ImplementedDocumentTool from "../settings/ImplementedDocumentTool";
import User from "../settings/User";
import DocumentToolUser from "../settings/DocumentToolUser";

@Entity("m_document_tools")
export default class DocumentTool extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255, collation: "utf8mb4_unicode_ci" })
  name: string;

  @Column({ type: "varchar", length: 25, collation: "utf8mb4_unicode_ci", nullable: true })
  tool_code: string;

  @OneToMany(
    () => ImplementedDocumentTool,
    implementedDocumentTool => implementedDocumentTool.documentTool,
    { cascade: true },
  )
  documentToolCompanies: ImplementedDocumentTool[];

  get companies(): Company[] {
    const documentToolCompanies = this.documentToolCompanies;
    return documentToolCompanies ? documentToolCompanies.map(record => record.company) : [];
  }

  @OneToMany(
    () => DocumentToolUser,
    documentToolUser => documentToolUser.documentTool,
    { cascade: true },
  )
  documentToolUsers: DocumentToolUser[];

  get users(): User[] {
    const documentToolUsers = this.documentToolUsers;
    return documentToolUsers ? documentToolUsers.map(record => record.user) : [];
  }
}