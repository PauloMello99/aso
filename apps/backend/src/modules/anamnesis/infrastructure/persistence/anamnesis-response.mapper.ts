import * as schema from "../../../../database/schema";
import { AnamnesisResponseEntity } from "../../domain/anamnesis-response.entity";
import type {
  AnamnesisResponseDetail,
  AnamnesisResponseListItem,
} from "../../domain/anamnesis-response.repository.interface";

export interface AnamnesisResponseListRow {
  response: typeof schema.anamnesisResponses.$inferSelect;
  customerName: string | null;
  serviceTypeName: string | null;
  versionNumber: number | null;
}

export class AnamnesisResponseMapper {
  static toDomain(
    row: typeof schema.anamnesisResponses.$inferSelect,
  ): AnamnesisResponseEntity {
    return AnamnesisResponseEntity.create({
      id: row.id,
      orgId: row.orgId,
      formVersionId: row.formVersionId ?? null,
      serviceTypeId: row.serviceTypeId ?? null,
      customerId: row.customerId ?? null,
      questionsSnapshot: row.questionsSnapshot,
      token: row.token,
      expiresAt: row.expiresAt,
      status: row.status,
      answers: row.answers ?? null,
      submittedAt: row.submittedAt ?? null,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt,
    });
  }

  static toListItem(row: AnamnesisResponseListRow): AnamnesisResponseListItem {
    const entity = AnamnesisResponseMapper.toDomain(row.response);
    return {
      id: row.response.id,
      customerId: row.response.customerId ?? null,
      customerName: row.customerName,
      serviceTypeId: row.response.serviceTypeId ?? null,
      serviceTypeName: row.serviceTypeName,
      status: entity.displayStatus,
      submittedAt: row.response.submittedAt ?? null,
      createdAt: row.response.createdAt,
      formVersionId: row.response.formVersionId ?? null,
      versionNumber: row.versionNumber,
    };
  }

  static toDetail(row: AnamnesisResponseListRow): AnamnesisResponseDetail {
    const entity = AnamnesisResponseMapper.toDomain(row.response);
    return Object.assign(entity, {
      customerName: row.customerName,
      serviceTypeName: row.serviceTypeName,
      versionNumber: row.versionNumber,
      signerFullName: row.response.signerFullName ?? null,
      signerCpf: row.response.signerCpf ?? null,
      signatureStoragePath: row.response.signatureStoragePath ?? null,
      pdfStoragePath: row.response.pdfStoragePath ?? null,
      consentTextSnapshot: row.response.consentTextSnapshot ?? null,
      consentAcceptedAt: row.response.consentAcceptedAt ?? null,
    });
  }
}
