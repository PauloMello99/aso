import type { ReceiptModel, ReportModel } from "../member-document.models";

export const MEMBER_DOCUMENT_GENERATOR = Symbol("MEMBER_DOCUMENT_GENERATOR");

export interface IMemberDocumentGenerator {
  generateReceipt(model: ReceiptModel): Promise<Buffer>;
  generateReport(model: ReportModel): Promise<Buffer>;
}
