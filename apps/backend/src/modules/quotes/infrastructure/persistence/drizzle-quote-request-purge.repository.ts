import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { toPersistenceError } from "./quote-persistence.error";
import type {
  IQuoteRequestPurgeRepository,
  QuoteRequestPurgeClaim,
} from "../../domain/quote-request-purge.repository.interface";
import {
  QUOTE_PURGE_SCOPE,
  type QuotePurgeScope,
} from "../../domain/quote-request-lifecycle";

const EXISTING_IDS_CHUNK_SIZE = 500;

type ClaimRow = {
  id: string;
  org_id: string;
  purge_scope: string;
  purge_attempts: number;
  purge_last_attempt_at: Date | string;
};

function toScope(value: string): QuotePurgeScope {
  return value === QUOTE_PURGE_SCOPE.IMAGES
    ? QUOTE_PURGE_SCOPE.IMAGES
    : QUOTE_PURGE_SCOPE.ALL;
}

// Erros do drizzle carregam sql + params (ids, paths): relancar so o SQLSTATE.
async function sanitized<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toPersistenceError(error);
  }
}

/**
 * Fila de purga (0091). SO DRIZZLE_ADMIN: o cron roda sem sessao e o tenant nunca
 * escreve purge_* (ADR-0021/ADR-0035). Toda escrita filtra por org_id.
 */
@Injectable()
export class DrizzleQuoteRequestPurgeRepository
  implements IQuoteRequestPurgeRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB) {}

  claimDuePurges(
    now: Date,
    leaseMs: number,
    limit: number,
  ): Promise<QuoteRequestPurgeClaim[]> {
    return sanitized(async () => {
      const nowIso = now.toISOString();
      const leaseCutoffIso = new Date(now.getTime() - leaseMs).toISOString();

      // Um unico statement: o lock de linha (SKIP LOCKED) e o UPDATE acontecem
      // juntos, entao dois ticks concorrentes nunca reivindicam o mesmo pedido.
      // `now` vem da aplicacao (nao now()) para que o claimedAt devolvido seja
      // identico ao gravado e sirva de chave de CAS (precisao de ms).
      const { rows } = await this.admin.execute<ClaimRow>(sql`
        WITH due AS (
          SELECT id FROM quote_requests
          WHERE (purge_requested_at IS NOT NULL OR expires_at <= ${nowIso}::timestamptz)
            AND (purge_last_attempt_at IS NULL OR purge_last_attempt_at <= ${leaseCutoffIso}::timestamptz)
          ORDER BY purge_attempts ASC, purge_last_attempt_at ASC NULLS FIRST, expires_at ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE quote_requests q SET
          purge_requested_at = COALESCE(q.purge_requested_at, ${nowIso}::timestamptz),
          purge_scope = CASE WHEN q.expires_at <= ${nowIso}::timestamptz THEN 'all' ELSE q.purge_scope END,
          purge_attempts = q.purge_attempts + 1,
          purge_last_attempt_at = ${nowIso}::timestamptz
        FROM due
        WHERE q.id = due.id
        RETURNING q.id, q.org_id, q.purge_scope, q.purge_attempts, q.purge_last_attempt_at
      `);

      return rows.map((row) => ({
        id: row.id,
        orgId: row.org_id,
        scope: toScope(row.purge_scope),
        attempts: Number(row.purge_attempts),
        claimedAt: new Date(row.purge_last_attempt_at),
      }));
    });
  }

  listImagePaths(orgId: string, id: string): Promise<string[]> {
    return sanitized(async () => {
      const rows = await this.admin
        .select({ storagePath: schema.quoteRequestImages.storagePath })
        .from(schema.quoteRequestImages)
        .where(
          and(
            eq(schema.quoteRequestImages.orgId, orgId),
            eq(schema.quoteRequestImages.quoteRequestId, id),
          ),
        );
      return rows.map((row) => row.storagePath);
    });
  }

  deleteRequest(orgId: string, id: string): Promise<boolean> {
    return sanitized(async () => {
      const deleted = await this.admin
        .delete(schema.quoteRequests)
        .where(
          and(
            eq(schema.quoteRequests.orgId, orgId),
            eq(schema.quoteRequests.id, id),
            eq(schema.quoteRequests.purgeScope, QUOTE_PURGE_SCOPE.ALL),
          ),
        )
        .returning({ id: schema.quoteRequests.id });
      return deleted.length > 0;
    });
  }

  completeImagePurge(
    orgId: string,
    id: string,
    claimedAt: Date,
  ): Promise<boolean> {
    return sanitized(() =>
      this.admin.transaction(async (tx) => {
        // CAS primeiro: se o claim foi perdido (outro tick reivindicou apos o
        // lease), nada e alterado e as imagens ficam para quem tem o claim.
        const released = await tx
          .update(schema.quoteRequests)
          .set({
            purgeRequestedAt: null,
            purgeScope: null,
            purgeAttempts: 0,
            purgeLastAttemptAt: null,
            purgeLastError: null,
          })
          .where(
            and(
              eq(schema.quoteRequests.orgId, orgId),
              eq(schema.quoteRequests.id, id),
              eq(schema.quoteRequests.purgeScope, QUOTE_PURGE_SCOPE.IMAGES),
              eq(schema.quoteRequests.purgeLastAttemptAt, claimedAt),
            ),
          )
          .returning({ id: schema.quoteRequests.id });
        if (released.length === 0) return false;

        await tx
          .delete(schema.quoteRequestImages)
          .where(
            and(
              eq(schema.quoteRequestImages.orgId, orgId),
              eq(schema.quoteRequestImages.quoteRequestId, id),
            ),
          );
        return true;
      }),
    );
  }

  recordPurgeFailure(orgId: string, id: string, code: string): Promise<void> {
    return sanitized(async () => {
      await this.admin
        .update(schema.quoteRequests)
        .set({ purgeLastError: code })
        .where(
          and(
            eq(schema.quoteRequests.orgId, orgId),
            eq(schema.quoteRequests.id, id),
            isNotNull(schema.quoteRequests.purgeRequestedAt),
          ),
        );
    });
  }

  findExistingRequestIds(orgId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return Promise.resolve(new Set());
    return sanitized(async () => {
      const existing = new Set<string>();
      for (let i = 0; i < ids.length; i += EXISTING_IDS_CHUNK_SIZE) {
        const chunk = ids.slice(i, i + EXISTING_IDS_CHUNK_SIZE);
        const rows = await this.admin
          .select({ id: schema.quoteRequests.id })
          .from(schema.quoteRequests)
          .where(
            and(
              eq(schema.quoteRequests.orgId, orgId),
              inArray(schema.quoteRequests.id, chunk),
            ),
          );
        for (const row of rows) existing.add(row.id);
      }
      return existing;
    });
  }
}
