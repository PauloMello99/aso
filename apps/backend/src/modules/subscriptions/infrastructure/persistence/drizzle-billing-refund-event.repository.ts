import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  BillingRefundEventEntity,
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

  async listByOrgId(orgId: string): Promise<BillingRefundEventEntity[]> {
    // Fixed ceiling of 100: no pagination until F4/F5.
    const rows = await this.db
      .select()
      .from(schema.billingRefundEvents)
      .where(eq(schema.billingRefundEvents.orgId, orgId))
      // occurred_at (the webhook envelope timestamp) can tie between rows of the
      // same refund; created_at (insertion order) is the deterministic tiebreak.
      .orderBy(
        desc(schema.billingRefundEvents.occurredAt),
        desc(schema.billingRefundEvents.createdAt),
      )
      .limit(100);
    return rows.map(toDomain);
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
}
