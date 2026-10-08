import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { toPersistenceError } from "./quote-persistence.error";
import type {
  CreateQuoteRequestData,
  CreateQuoteRequestImageData,
  IQuoteRequestRepository,
} from "../../domain/quote-request.repository.interface";

@Injectable()
export class DrizzleQuoteRequestRepository implements IQuoteRequestRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB) {}

  /**
   * DRIZZLE_ADMIN escopado (ADR-0021/ADR-0035): usado so pela rota publica, sem
   * sessao, onde o RLS negaria a escrita. org_id e target_user_id vem do slug
   * resolvido no servidor. Pedido e imagens numa unica transacao (atomico).
   */
  async createWithImagesAsAdmin(
    request: CreateQuoteRequestData,
    images: CreateQuoteRequestImageData[],
  ): Promise<void> {
    try {
      await this.insertWithImages(request, images);
    } catch (error) {
      // Erros do drizzle carregam sql + params (nome/e-mail/telefone/ideia) na
      // message e em cause: relancar SO o SQLSTATE, sem cause.
      throw toPersistenceError(error);
    }
  }

  private async insertWithImages(
    request: CreateQuoteRequestData,
    images: CreateQuoteRequestImageData[],
  ): Promise<void> {
    await this.admin.transaction(async (tx) => {
      await tx.insert(schema.quoteRequests).values({
        id: request.id,
        createdAt: request.createdAt,
        orgId: request.orgId,
        targetUserId: request.targetUserId,
        requesterName: request.requesterName,
        requesterPhone: request.requesterPhone,
        requesterEmail: request.requesterEmail,
        idea: request.idea,
        consentVersion: request.consentVersion,
        consentTextSnapshot: request.consentTextSnapshot,
        privacyConsentAcceptedAt: request.privacyConsentAcceptedAt,
        contactRetentionConsentAcceptedAt:
          request.contactRetentionConsentAcceptedAt,
        expiresAt: request.expiresAt,
      });

      if (images.length === 0) return;

      await tx.insert(schema.quoteRequestImages).values(
        images.map((image) => ({
          orgId: request.orgId,
          quoteRequestId: request.id,
          storagePath: image.storagePath,
          contentType: image.contentType,
          sizeBytes: image.sizeBytes,
          position: image.position,
        })),
      );
    });
  }
}
