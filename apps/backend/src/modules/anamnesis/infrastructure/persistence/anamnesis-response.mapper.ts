import * as schema from "../../../../database/schema";
import { AnamnesisResponseEntity } from "../../domain/anamnesis-response.entity";

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
}
