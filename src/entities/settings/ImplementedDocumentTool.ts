import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import BaseEntity from "../BaseEntity";
import Company from "../settings/Company";
import DocumentTool from "../masters/DocumentTool";

@Entity("s_implemented_document_tools")
export default class ImplementedDocumentTool extends BaseEntity {
  @PrimaryColumn()
  company_id: number;

  @PrimaryColumn()
  document_tool_id: number;

  @ManyToOne(
    () => Company,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "company_id" })
  company: Company;

  @ManyToOne(
    () => DocumentTool,
    documentTool => documentTool.documentToolCompanies,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" },
  )
  @JoinColumn({ name: "document_tool_id" })
  documentTool: DocumentTool;
}
