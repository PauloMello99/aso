import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  min,
  notExists,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  BillingRefundEventEntity,
  BillingRefundEventStatus,
  CreateBillingRefundEventData,
  IBillingRefundEventRepository,
} from "../../domain/billing-refund-event.repository.interface";

type BillingRefundEventRow = typeof schema.billingRefundEvents.$inferSelect;

function toDomain(row: BillingRefundEventRow): BillingRefundEventEntity {
  return {
    id: row.id,
    stripeRefundId: row.stripeRefundId,
    stripeChargeId: row.stripeChargeId ?? null,
    orgId: row.orgId ?? null,
    status: row.status,
    amountCents: row.amountCents,
    currency: row.currency,
    reason: row.reason ?? null,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class DrizzleBillingRefundEventRepository
  implements IBillingRefundEventRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async create(data: CreateBillingRefundEventData): Promise<void> {
    await this.db
      .insert(schema.billingRefundEvents)
      .values({
        stripeRefundId: data.stripeRefundId,
        stripeChargeId: data.stripeChargeId ?? null,
        orgId: data.orgId ?? null,
        status: data.status,
        amountCents: data.amountCents,
        currency: data.currency,
        reason: data.reason ?? null,
        occurredAt: data.occurredAt,
      })
      .onConflictDoNothing({
        target: [
          schema.billingRefundEvents.stripeRefundId,
          schema.billingRefundEvents.status,
        ],
      });
  }

  async listPageByOrgId(
    orgId: string,
    params: { limit: number; offset: number },
  ): Promise<{ rows: BillingRefundEventEntity[]; total: number }> {
    const where = eq(schema.billingRefundEvents.orgId, orgId);
    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(schema.billingRefundEvents)
        .where(where)
        // occurred_at (the webhook envelope timestamp) can tie between rows of
        // the same refund; created_at (insertion order) is the deterministic
        // tiebreak.
        .orderBy(
          desc(schema.billingRefundEvents.occurredAt),
          desc(schema.billingRefundEvents.createdAt),
        )
        .limit(params.limit)
        .offset(params.offset),
      this.db
        .select({ value: count() })
        .from(schema.billingRefundEvents)
        .where(where),
    ]);
    return { rows: rows.map(toDomain), total: Number(totalRow?.value ?? 0) };
  }

  // The two reads below exist to correlate a refund to an org without calling
  // `charges.retrieve` per event; a `null` result is normal (refund of a charge
  // we never mirrored).
  async findResolvedOrgIdByRefundId(
    stripeRefundId: string,
  ): Promise<string | null> {
    const rows = await this.db
      .select({ orgId: schema.billingRefundEvents.orgId })
      .from(schema.billingRefundEvents)
      .where(
        and(
          eq(schema.billingRefundEvents.stripeRefundId, stripeRefundId),
          isNotNull(schema.billingRefundEvents.orgId),
        ),
      )
      .limit(1);
    return rows[0]?.orgId ?? null;
  }

  async findResolvedOrgIdByChargeId(
    stripeChargeId: string,
  ): Promise<string | null> {
    const rows = await this.db
      .select({ orgId: schema.billingRefundEvents.orgId })
      .from(schema.billingRefundEvents)
      .where(
        and(
          eq(schema.billingRefundEvents.stripeChargeId, stripeChargeId),
          isNotNull(schema.billingRefundEvents.orgId),
        ),
      )
      .limit(1);
    return rows[0]?.orgId ?? null;
  }

  async listUnresolvedChargeIds(limit: number, since: Date): Promise<string[]> {
    const sibling = alias(schema.billingRefundEvents, "b2");
    const rows = await this.db
      .select({ chargeId: schema.billingRefundEvents.stripeChargeId })
      .from(schema.billingRefundEvents)
      .where(
        and(
          isNull(schema.billingRefundEvents.orgId),
          isNotNull(schema.billingRefundEvents.stripeChargeId),
          // Lower-bound the scan so permanently irresolvable (and always
          // oldest) charges cannot starve newer resolvable orphans.
          gte(schema.billingRefundEvents.occurredAt, since),
          // Skip refunds already resolved on another status row — without this
          // the orphan pass would re-pick the same refund forever.
          notExists(
            this.db
              .select({ one: sibling.id })
              .from(sibling)
              .where(
                and(
                  eq(
                    sibling.stripeRefundId,
                    schema.billingRefundEvents.stripeRefundId,
                  ),
                  isNotNull(sibling.orgId),
                ),
              ),
          ),
        ),
      )
      // group + min(occurred_at) so the DISTINCT charge ids can still be
      // ordered oldest-first (a bare SELECT DISTINCT cannot ORDER BY a column
      // that is not in its select list).
      .groupBy(schema.billingRefundEvents.stripeChargeId)
      .orderBy(asc(min(schema.billingRefundEvents.occurredAt)))
      .limit(limit);
    return rows
      .map((row) => row.chargeId)
      .filter((id): id is string => id !== null);
  }

  async findStatusesByRefundIds(
    refundIds: string[],
  ): Promise<Map<string, BillingRefundEventStatus[]>> {
    const byRefundId = new Map<string, BillingRefundEventStatus[]>();
    if (refundIds.length === 0) return byRefundId;
    const rows = await this.db
      .select({
        stripeRefundId: schema.billingRefundEvents.stripeRefundId,
        status: schema.billingRefundEvents.status,
      })
      .from(schema.billingRefundEvents)
      .where(inArray(schema.billingRefundEvents.stripeRefundId, refundIds));
    for (const row of rows) {
      const existing = byRefundId.get(row.stripeRefundId);
      if (existing) existing.push(row.status);
      else byRefundId.set(row.stripeRefundId, [row.status]);
    }
    return byRefundId;
  }

  /**
   * See the interface doc-comment: a sanctioned exception to this table's
   * append-only rule (T4-F5 decision D4). Fills the `org_id` correlation
   * column only where it is still `NULL`; never touches any status, monetary
   * or timestamp column.
   */
  async resolveOrgIdWhereNull(
    stripeChargeId: string,
    orgId: string,
  ): Promise<number> {
    const updated = await this.db
      .update(schema.billingRefundEvents)
      .set({ orgId })
      .where(
        and(
          eq(schema.billingRefundEvents.stripeChargeId, stripeChargeId),
          isNull(schema.billingRefundEvents.orgId),
        ),
      )
      .returning({ id: schema.billingRefundEvents.id });
    return updated.length;
  }

  /**
   * See the interface doc-comment: the "per refund" counterpart of
   * `resolveOrgIdWhereNull`, a sanctioned exception to this table's
   * append-only rule (T4-F5 decision D4). Fills `org_id` only where it is
   * still `NULL`, only from a sibling row of the same `stripe_refund_id` that
   * already carries a non-null `org_id`; never touches any status, monetary or
   * timestamp column.
   *
   * Raw SQL: this is a single set-based self-join `UPDATE ... FROM` keyed by
   * `stripe_refund_id`, the same tool the materials module uses for set-based
   * statements (`drizzle-stock-verification.repository.ts`). Postgres rejects a
   * qualified target column in `SET`, hence `SET org_id = ...` (not
   * `SET t.org_id = ...`). `RETURNING t.id` gives the affected-row count.
   */
  async backfillOrgIdFromResolvedSiblings(): Promise<number> {
    const { rows } = await this.db.execute<{ id: string }>(sql`
      UPDATE billing_refund_events AS t
      SET org_id = s.org_id
      FROM billing_refund_events AS s
      WHERE s.stripe_refund_id = t.stripe_refund_id
        AND s.org_id IS NOT NULL
        AND t.org_id IS NULL
      RETURNING t.id
    `);
    return rows.length;
  }
}
