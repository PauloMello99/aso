import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
  UpsertBillingPlanData,
} from "../../domain/billing-plan.repository.interface";

type BillingPlanRow = typeof schema.billingPlans.$inferSelect;

function toDomain(row: BillingPlanRow): BillingPlanEntity {
  return {
    id: row.id,
    key: row.key,
    stripeProductId: row.stripeProductId ?? null,
    stripePriceId: row.stripePriceId ?? null,
    name: row.name,
    amountCents: row.amountCents,
    currency: row.currency,
    interval: row.interval,
    active: row.active,
    lastSyncedAt: row.lastSyncedAt ?? null,
  };
}

@Injectable()
export class DrizzleBillingPlanRepository implements IBillingPlanRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findByKey(key: string): Promise<BillingPlanEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingPlans)
      .where(eq(schema.billingPlans.key, key))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(): Promise<BillingPlanEntity[]> {
    const rows = await this.db.select().from(schema.billingPlans);
    return rows.map(toDomain);
  }

  async upsert(data: UpsertBillingPlanData): Promise<BillingPlanEntity> {
    const [row] = await this.db
      .insert(schema.billingPlans)
      .values({
        key: data.key,
        stripeProductId: data.stripeProductId ?? null,
        stripePriceId: data.stripePriceId ?? null,
        name: data.name,
        amountCents: data.amountCents,
        currency: data.currency,
        interval: data.interval,
        ...(data.active !== undefined && { active: data.active }),
        lastSyncedAt: data.lastSyncedAt ?? null,
      })
      .onConflictDoUpdate({
        target: schema.billingPlans.key,
        set: {
          stripeProductId: data.stripeProductId ?? null,
          stripePriceId: data.stripePriceId ?? null,
          name: data.name,
          amountCents: data.amountCents,
          currency: data.currency,
          interval: data.interval,
          ...(data.active !== undefined && { active: data.active }),
          lastSyncedAt: data.lastSyncedAt ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return toDomain(row!);
  }
}
