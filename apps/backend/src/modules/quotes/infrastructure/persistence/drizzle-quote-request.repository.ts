import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { toPersistenceError } from "./quote-persistence.error";
import type {
  CreateQuoteRequestData,
  CreateQuoteRequestImageData,
  IQuoteRequestRepository,
  ListQuoteRequestsQuery,
  QuoteRequestDetail,
  QuoteRequestListPage,
} from "../../domain/quote-request.repository.interface";
import type { QuoteRequestViewerScope } from "../../domain/quote-request-viewer-scope";
import { QUOTE_REQUEST_STATUS } from "../../domain/quote-request-lifecycle";

// Filtro explicito de org + escopo do leitor. O RLS (0089) impoe o mesmo recorte
// no banco; aqui e o filtro de aplicacao (org_id da sessao, nunca do cliente).
// Pedidos expirados (expires_at <= now), encerrados (status <> 'new') ou com purga
// pendente (purge_requested_at nao nulo) ficam invisiveis, mesmo antes da purga.
function visibleTo(orgId: string, scope: QuoteRequestViewerScope): SQL | undefined {
  return and(
    eq(schema.quoteRequests.orgId, orgId),
    gt(schema.quoteRequests.expiresAt, sql`now()`),
    eq(schema.quoteRequests.status, QUOTE_REQUEST_STATUS.NEW),
    isNull(schema.quoteRequests.purgeRequestedAt),
    scope.kind === "own"
      ? eq(schema.quoteRequests.targetUserId, scope.userId)
      : undefined,
  );
}

// Nome publico do profissional-alvo (quote_forms e legivel por membros da org, RLS 0087).
const targetFormJoin = and(
  eq(schema.quoteForms.orgId, schema.quoteRequests.orgId),
  eq(schema.quoteForms.userId, schema.quoteRequests.targetUserId),
);

// Erros do drizzle carregam sql + params (PII do solicitante): relancar so o SQLSTATE.
async function sanitized<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toPersistenceError(error);
  }
}

@Injectable()
export class DrizzleQuoteRequestRepository implements IQuoteRequestRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  /** DRIZZLE (sessao + RLS 0089): mais recentes primeiro, com contagem de imagens. */
  listForViewer(
    orgId: string,
    scope: QuoteRequestViewerScope,
    query: ListQuoteRequestsQuery,
  ): Promise<QuoteRequestListPage> {
    return sanitized(async () => {
      const where = and(
        visibleTo(orgId, scope),
        query.unreadOnly ? isNull(schema.quoteRequests.viewedAt) : undefined,
      );

      const rows = await this.db
        .select({
          id: schema.quoteRequests.id,
          targetUserId: schema.quoteRequests.targetUserId,
          requesterName: schema.quoteRequests.requesterName,
          idea: schema.quoteRequests.idea,
          status: schema.quoteRequests.status,
          viewedAt: schema.quoteRequests.viewedAt,
          createdAt: schema.quoteRequests.createdAt,
          expiresAt: schema.quoteRequests.expiresAt,
          targetDisplayName: schema.quoteForms.displayName,
        })
        .from(schema.quoteRequests)
        .leftJoin(schema.quoteForms, targetFormJoin)
        .where(where)
        .orderBy(desc(schema.quoteRequests.createdAt), desc(schema.quoteRequests.id))
        .limit(query.limit)
        .offset(query.offset);

      const [totalRow] = await this.db
        .select({ total: count() })
        .from(schema.quoteRequests)
        .where(where);

      const imageCounts = new Map<string, number>();
      if (rows.length > 0) {
        const counted = await this.db
          .select({
            quoteRequestId: schema.quoteRequestImages.quoteRequestId,
            total: count(),
          })
          .from(schema.quoteRequestImages)
          .where(
            and(
              eq(schema.quoteRequestImages.orgId, orgId),
              inArray(
                schema.quoteRequestImages.quoteRequestId,
                rows.map((row) => row.id),
              ),
            ),
          )
          .groupBy(schema.quoteRequestImages.quoteRequestId);
        for (const entry of counted) {
          imageCounts.set(entry.quoteRequestId, entry.total);
        }
      }

      return {
        items: rows.map((row) => ({
          ...row,
          imageCount: imageCounts.get(row.id) ?? 0,
        })),
        total: totalRow?.total ?? 0,
      };
    });
  }

  /** DRIZZLE (sessao + RLS 0089): badge de nao lidos. */
  countUnreadForViewer(
    orgId: string,
    scope: QuoteRequestViewerScope,
  ): Promise<number> {
    return sanitized(async () => {
      const [row] = await this.db
        .select({ total: count() })
        .from(schema.quoteRequests)
        .where(
          and(
            visibleTo(orgId, scope),
            isNull(schema.quoteRequests.viewedAt),
          ),
        );
      return row?.total ?? 0;
    });
  }

  /** DRIZZLE (sessao + RLS 0089): null quando inexistente ou fora do escopo. */
  findDetailForViewer(
    orgId: string,
    scope: QuoteRequestViewerScope,
    id: string,
  ): Promise<QuoteRequestDetail | null> {
    return sanitized(async () => {
      const [row] = await this.db
        .select({
          id: schema.quoteRequests.id,
          targetUserId: schema.quoteRequests.targetUserId,
          requesterName: schema.quoteRequests.requesterName,
          requesterPhone: schema.quoteRequests.requesterPhone,
          requesterEmail: schema.quoteRequests.requesterEmail,
          idea: schema.quoteRequests.idea,
          status: schema.quoteRequests.status,
          viewedAt: schema.quoteRequests.viewedAt,
          createdAt: schema.quoteRequests.createdAt,
          expiresAt: schema.quoteRequests.expiresAt,
          contactRetentionConsentAcceptedAt:
            schema.quoteRequests.contactRetentionConsentAcceptedAt,
          targetDisplayName: schema.quoteForms.displayName,
        })
        .from(schema.quoteRequests)
        .leftJoin(schema.quoteForms, targetFormJoin)
        .where(and(visibleTo(orgId, scope), eq(schema.quoteRequests.id, id)))
        .limit(1);
      if (!row) return null;

      const images = await this.db
        .select({
          id: schema.quoteRequestImages.id,
          storagePath: schema.quoteRequestImages.storagePath,
          contentType: schema.quoteRequestImages.contentType,
          sizeBytes: schema.quoteRequestImages.sizeBytes,
          position: schema.quoteRequestImages.position,
        })
        .from(schema.quoteRequestImages)
        .where(
          and(
            eq(schema.quoteRequestImages.quoteRequestId, id),
            eq(schema.quoteRequestImages.orgId, orgId),
          ),
        )
        .orderBy(asc(schema.quoteRequestImages.position));

      return { ...row, images };
    });
  }

  /**
   * DRIZZLE (sessao + RLS 0089). Seta SOMENTE viewed_at (unica coluna com GRANT de
   * UPDATE ao app_user) e so quando ainda nulo, preservando o primeiro "visto".
   */
  markViewed(
    orgId: string,
    scope: QuoteRequestViewerScope,
    id: string,
    viewedAt: Date,
  ): Promise<void> {
    return sanitized(async () => {
      await this.db
        .update(schema.quoteRequests)
        .set({ viewedAt })
        .where(
          and(
            visibleTo(orgId, scope),
            eq(schema.quoteRequests.id, id),
            isNull(schema.quoteRequests.viewedAt),
          ),
        );
    });
  }

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
