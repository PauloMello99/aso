import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { TicketEntity, TicketStatus } from "../../domain/ticket.entity";
import {
  ITicketRepository,
  ListTicketsByOrgFilters,
  ListTicketsForAdminQueueFilters,
  TicketOrgSummary,
} from "../../domain/ticket.repository.interface";
import { TransactionContext } from "../../domain/ports/transaction-runner.port";
import { TicketAlreadyLinkedException } from "../../domain/exceptions/ticket-already-linked.exception";
import { TicketMapper } from "./ticket.mapper";

@Injectable()
export class DrizzleTicketRepository implements ITicketRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async createAsAdmin(
    ticket: TicketEntity,
    tx?: TransactionContext,
  ): Promise<TicketEntity> {
    const db = (tx as unknown as DrizzleDB | undefined) ?? this.admin;
    const [row] = await db
      .insert(schema.tickets)
      .values({
        id: ticket.id,
        orgId: ticket.orgId,
        categoryId: ticket.categoryId,
        createdBy: ticket.createdBy,
        requesterName: ticket.requesterName,
        requesterEmail: ticket.requesterEmail,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignedAgentId: ticket.assignedAgentId,
        firstResponseAt: ticket.firstResponseAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        reopenedAt: ticket.reopenedAt,
        slaFirstResponseDueAt: ticket.slaFirstResponseDueAt,
        slaResolutionDueAt: ticket.slaResolutionDueAt,
        slaFirstResponseBreachedAt: ticket.slaFirstResponseBreachedAt,
        slaResolutionBreachedAt: ticket.slaResolutionBreachedAt,
        slaWarningNotifiedAt: ticket.slaWarningNotifiedAt,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      })
      .returning();
    if (!row) throw new Error("Failed to create ticket");
    return TicketMapper.toDomain(row);
  }

  async findByIdInOrg(
    id: string,
    orgId: string,
  ): Promise<TicketEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.tickets)
      .where(and(eq(schema.tickets.id, id), eq(schema.tickets.orgId, orgId)))
      .limit(1);
    return row ? TicketMapper.toDomain(row) : null;
  }

  async findByIdAsAdmin(
    id: string,
    tx?: TransactionContext,
  ): Promise<TicketEntity | null> {
    const db = (tx as unknown as DrizzleDB | undefined) ?? this.admin;
    const [row] = await db
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.id, id))
      .limit(1);
    return row ? TicketMapper.toDomain(row) : null;
  }

  async listByOrg(
    orgId: string,
    filters: ListTicketsByOrgFilters,
  ): Promise<{ items: TicketEntity[]; total: number }> {
    const conditions = [eq(schema.tickets.orgId, orgId)];
    if (filters.status) {
      conditions.push(
        eq(schema.tickets.status, filters.status as TicketStatus),
      );
    }
    if (filters.categoryId) {
      conditions.push(eq(schema.tickets.categoryId, filters.categoryId));
    }
    const where = and(...conditions);

    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(schema.tickets)
        .where(where)
        .orderBy(desc(schema.tickets.createdAt))
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize),
      this.db.select({ value: count() }).from(schema.tickets).where(where),
    ]);

    return {
      items: rows.map(TicketMapper.toDomain),
      total: Number(totalRow?.value ?? 0),
    };
  }

  async updateAsAdmin(
    ticket: TicketEntity,
    tx?: TransactionContext,
  ): Promise<TicketEntity> {
    const db = (tx as unknown as DrizzleDB | undefined) ?? this.admin;
    const [row] = await db
      .update(schema.tickets)
      .set({
        categoryId: ticket.categoryId,
        requesterName: ticket.requesterName,
        requesterEmail: ticket.requesterEmail,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignedAgentId: ticket.assignedAgentId,
        firstResponseAt: ticket.firstResponseAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        reopenedAt: ticket.reopenedAt,
        slaFirstResponseDueAt: ticket.slaFirstResponseDueAt,
        slaResolutionDueAt: ticket.slaResolutionDueAt,
        slaFirstResponseBreachedAt: ticket.slaFirstResponseBreachedAt,
        slaResolutionBreachedAt: ticket.slaResolutionBreachedAt,
        slaWarningNotifiedAt: ticket.slaWarningNotifiedAt,
        updatedAt: ticket.updatedAt,
      })
      .where(
        and(
          eq(schema.tickets.id, ticket.id),
          ticket.orgId
            ? eq(schema.tickets.orgId, ticket.orgId)
            : isNull(schema.tickets.orgId),
        ),
      )
      .returning();
    if (!row) throw new Error("Failed to update ticket");
    return TicketMapper.toDomain(row);
  }

  /**
   * Candidatos a checagem de SLA (breach ou near-breach). O limiar de
   * near-breach espelha `isSlaNearBreach` de `ticket-sla.ts`
   * (warningThresholdRatio padrão = 0.2): near-breach OU breach ocorre
   * quando `now >= dueAt - 0.2 * (dueAt - createdAt)`. A decisão fina
   * (marcar breach vs. só avisar) fica a cargo do use-case do cron
   * (fora deste passo), que deve reaplicar `isSlaBreached`/`isSlaNearBreach`
   * sobre cada candidato retornado aqui.
   */
  async listSlaCandidates(now: Date): Promise<TicketEntity[]> {
    const firstResponseThreshold = sql`${schema.tickets.slaFirstResponseDueAt} - (${schema.tickets.slaFirstResponseDueAt} - ${schema.tickets.createdAt}) * 0.2`;
    const resolutionThreshold = sql`${schema.tickets.slaResolutionDueAt} - (${schema.tickets.slaResolutionDueAt} - ${schema.tickets.createdAt}) * 0.2`;

    const rows = await this.admin
      .select()
      .from(schema.tickets)
      .where(
        and(
          ne(schema.tickets.status, "closed"),
          or(
            and(
              isNull(schema.tickets.firstResponseAt),
              isNull(schema.tickets.slaFirstResponseBreachedAt),
              sql`${now}::timestamptz >= ${firstResponseThreshold}`,
            ),
            and(
              isNull(schema.tickets.resolvedAt),
              isNull(schema.tickets.slaResolutionBreachedAt),
              sql`${now}::timestamptz >= ${resolutionThreshold}`,
            ),
          ),
        ),
      )
      .orderBy(asc(schema.tickets.slaFirstResponseDueAt));
    return rows.map(TicketMapper.toDomain);
  }

  async listAllForAdminQueue(
    filters: ListTicketsForAdminQueueFilters,
  ): Promise<{ items: TicketEntity[]; total: number }> {
    const conditions = [];
    if (filters.status) {
      conditions.push(
        eq(schema.tickets.status, filters.status as TicketStatus),
      );
    }
    if (filters.categoryId) {
      conditions.push(eq(schema.tickets.categoryId, filters.categoryId));
    }
    if (filters.orphanOnly) {
      conditions.push(isNull(schema.tickets.orgId));
    } else if (filters.orgId) {
      conditions.push(eq(schema.tickets.orgId, filters.orgId));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [totalRow]] = await Promise.all([
      this.admin
        .select()
        .from(schema.tickets)
        .where(where)
        .orderBy(desc(schema.tickets.createdAt))
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize),
      this.admin.select({ value: count() }).from(schema.tickets).where(where),
    ]);

    return {
      items: rows.map(TicketMapper.toDomain),
      total: Number(totalRow?.value ?? 0),
    };
  }

  /**
   * Vincula um ticket órfão a uma organização (ver JSDoc da interface).
   * Roda inteiramente na conexão da transação (`this.admin.transaction`,
   * não `ITransactionRunner` — o mecanismo do port existe para expor
   * transação para a camada de aplicação; aqui a transação já nasce e
   * morre dentro do próprio repositório, então usar o runner só trocaria
   * o cast de `TransactionContext -> DrizzleDB` de lugar sem reduzir
   * acoplamento real).
   */
  async linkToOrganization(
    ticketId: string,
    orgId: string,
  ): Promise<TicketEntity> {
    return this.admin.transaction(async (tx) => {
      const [ticketRow] = await tx
        .update(schema.tickets)
        .set({ orgId, updatedAt: new Date() })
        .where(
          and(eq(schema.tickets.id, ticketId), isNull(schema.tickets.orgId)),
        )
        .returning();
      if (!ticketRow) {
        // 0 linhas afetadas: ticket não existe OU já foi vinculado por outra
        // request entre a checagem do use-case e este UPDATE (corrida). O
        // use-case já valida "já vinculado" antes de chamar este método;
        // isto é a segunda camada de proteção contra a janela de corrida.
        throw new TicketAlreadyLinkedException(ticketId);
      }

      await tx
        .update(schema.ticketResponses)
        .set({ orgId })
        .where(eq(schema.ticketResponses.ticketId, ticketId));
      await tx
        .update(schema.ticketAttachments)
        .set({ orgId })
        .where(eq(schema.ticketAttachments.ticketId, ticketId));

      const [[orphanResponses], [orphanAttachments]] = await Promise.all([
        tx
          .select({ value: count() })
          .from(schema.ticketResponses)
          .where(
            and(
              eq(schema.ticketResponses.ticketId, ticketId),
              isNull(schema.ticketResponses.orgId),
            ),
          ),
        tx
          .select({ value: count() })
          .from(schema.ticketAttachments)
          .where(
            and(
              eq(schema.ticketAttachments.ticketId, ticketId),
              isNull(schema.ticketAttachments.orgId),
            ),
          ),
      ]);
      if (
        Number(orphanResponses?.value ?? 0) > 0 ||
        Number(orphanAttachments?.value ?? 0) > 0
      ) {
        // Invariante quebrada (bug de propagação), não uma condição de
        // negócio esperada — aborta a transação com erro genérico, igual ao
        // padrão de `createAsAdmin`/`updateAsAdmin` acima.
        throw new Error(
          `linkToOrganization: propagação de org_id deixou filhos órfãos para ticket ${ticketId}`,
        );
      }

      return TicketMapper.toDomain(ticketRow);
    });
  }

  async findOrgById(orgId: string): Promise<TicketOrgSummary | null> {
    const [row] = await this.admin
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
        slug: schema.organizations.slug,
      })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1);
    return row ?? null;
  }
}
