import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { toPersistenceError } from "./quote-persistence.error";
import type {
  IQuoteFormRepository,
  PublicQuoteFormTarget,
  QuoteFormRecord,
  UpsertQuoteFormData,
} from "../../domain/quote-form.repository.interface";
import { QuoteFormSlugUnavailableException } from "../../domain/exceptions/quote-form-slug-unavailable.exception";

const SLUG_UNIQUE_CONSTRAINT = "quote_forms_slug_uq";

/**
 * Percorre a cadeia de `cause` (drizzle-orm 0.45 embrulha o erro do driver) ate
 * achar um 23505 e devolve o nome da constraint. Checa `code` na raiz E em
 * `cause` (gotcha M10b); le `constraint` (pg) e `constraint_name` (postgres-js).
 */
export function findUniqueViolationConstraint(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
    cause?: unknown;
  };
  if (candidate.code === "23505") {
    const name = candidate.constraint ?? candidate.constraint_name;
    return typeof name === "string" ? name : undefined;
  }
  return findUniqueViolationConstraint(candidate.cause);
}

type QuoteFormRow = typeof schema.quoteForms.$inferSelect;

function toRecord(row: QuoteFormRow): QuoteFormRecord {
  return {
    slug: row.slug,
    displayName: row.displayName,
    enabled: row.enabled,
  };
}

@Injectable()
export class DrizzleQuoteFormRepository implements IQuoteFormRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async findMemberContext(
    orgId: string,
    authId: string,
  ): Promise<{ userId: string } | null> {
    const [row] = await this.db
      .select({ userId: schema.users.id })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.users.authId, authId),
          eq(schema.orgMemberships.enabled, true),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<QuoteFormRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.quoteForms)
      .where(
        and(
          eq(schema.quoteForms.orgId, orgId),
          eq(schema.quoteForms.userId, userId),
        ),
      )
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async upsertForMember(data: UpsertQuoteFormData): Promise<QuoteFormRecord> {
    try {
      const [row] = await this.db
        .insert(schema.quoteForms)
        .values({
          orgId: data.orgId,
          userId: data.userId,
          slug: data.slug,
          displayName: data.displayName,
          enabled: data.enabled,
        })
        .onConflictDoUpdate({
          target: [schema.quoteForms.orgId, schema.quoteForms.userId],
          set: {
            slug: data.slug,
            displayName: data.displayName,
            enabled: data.enabled,
            updatedAt: new Date(),
          },
        })
        .returning();
      return toRecord(row!);
    } catch (error) {
      // Nao engolir nem continuar: a transacao do request ja esta abortada.
      if (findUniqueViolationConstraint(error) === SLUG_UNIQUE_CONSTRAINT) {
        throw new QuoteFormSlugUnavailableException();
      }
      // slug/displayName nao podem vazar em params de erro do drizzle.
      throw toPersistenceError(error);
    }
  }

  /**
   * DRIZZLE_ADMIN (bypass de RLS) escopado: rota publica sem sessao, em que o
   * RlsInterceptor nao abre transacao com claims (excecao deliberada, ADR-0021/
   * ADR-0035). O org_id e o profissional-alvo sao DERIVADOS do slug aqui no
   * servidor, nunca do cliente. Org suspensa, membro desabilitado ou formulario
   * desativado resultam em null (indistinguivel de slug inexistente). O mesmo vale
   * para funcionario SEM o modulo 'quotes' (owner sempre tem acesso): sem isso o
   * pedido entraria numa caixa de entrada que ele nao consegue abrir.
   */
  async findPublicBySlugAsAdmin(
    slug: string,
  ): Promise<PublicQuoteFormTarget | null> {
    try {
      const [row] = await this.admin
        .select({
          formId: schema.quoteForms.id,
          orgId: schema.quoteForms.orgId,
          targetUserId: schema.quoteForms.userId,
          orgName: schema.organizations.name,
          displayName: schema.quoteForms.displayName,
        })
        .from(schema.quoteForms)
        .innerJoin(
          schema.organizations,
          eq(schema.organizations.id, schema.quoteForms.orgId),
        )
        .innerJoin(
          schema.orgMemberships,
          and(
            eq(schema.orgMemberships.orgId, schema.quoteForms.orgId),
            eq(schema.orgMemberships.userId, schema.quoteForms.userId),
          ),
        )
        .where(
          and(
            eq(schema.quoteForms.slug, slug),
            eq(schema.quoteForms.enabled, true),
            isNull(schema.organizations.suspendedAt),
            eq(schema.orgMemberships.enabled, true),
            or(
              eq(schema.orgMemberships.role, "owner"),
              sql`'quotes' = ANY(${schema.orgMemberships.permissions})`,
            ),
          ),
        )
        .limit(1);
      return row ?? null;
    } catch (error) {
      // O slug (params) nao deve chegar a log/telemetria.
      throw toPersistenceError(error);
    }
  }
}
