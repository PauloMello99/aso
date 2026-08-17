import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { BillingInterval } from "../../domain/subscription.entity";
import {
  BillingPlanPriceEntity,
  CreateBillingPlanPriceData,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";

type BillingPlanPriceRow = typeof schema.billingPlanPrices.$inferSelect;

function toDomain(row: BillingPlanPriceRow): BillingPlanPriceEntity {
  return {
    id: row.id,
    planId: row.planId,
    interval: row.interval as BillingInterval,
    amountCents: row.amountCents,
    currency: row.currency,
    stripePriceId: row.stripePriceId ?? null,
    lookupKey: row.lookupKey ?? null,
    active: row.active,
    lastSyncedAt: row.lastSyncedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class DrizzleBillingPlanPriceRepository
  implements IBillingPlanPriceRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findActiveByPlanId(planId: string): Promise<BillingPlanPriceEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.billingPlanPrices)
      .where(
        and(
          eq(schema.billingPlanPrices.planId, planId),
          eq(schema.billingPlanPrices.active, true),
        ),
      );
    return rows.map(toDomain);
  }

  async findAllByPlanId(planId: string): Promise<BillingPlanPriceEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.billingPlanPrices)
      .where(eq(schema.billingPlanPrices.planId, planId));
    return rows.map(toDomain);
  }

  async findActiveByPlanIdAndInterval(
    planId: string,
    interval: BillingInterval,
  ): Promise<BillingPlanPriceEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingPlanPrices)
      .where(
        and(
          eq(schema.billingPlanPrices.planId, planId),
          eq(schema.billingPlanPrices.interval, interval),
          eq(schema.billingPlanPrices.active, true),
        ),
      )
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByPlanIdAndInterval(
    planId: string,
    interval: BillingInterval,
  ): Promise<BillingPlanPriceEntity | null> {
    // Sem filtro de `active`: pode haver várias linhas históricas para o
    // mesmo (plan_id, interval) após rotações de preço. Ordena pela mais
    // recente — é a única garantida a ter `lookupKey` preservado, já que
    // `deactivateById` limpa o das linhas superadas por rotação.
    const [row] = await this.db
      .select()
      .from(schema.billingPlanPrices)
      .where(
        and(
          eq(schema.billingPlanPrices.planId, planId),
          eq(schema.billingPlanPrices.interval, interval),
        ),
      )
      .orderBy(desc(schema.billingPlanPrices.createdAt))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByStripePriceId(
    stripePriceId: string,
  ): Promise<BillingPlanPriceEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingPlanPrices)
      .where(eq(schema.billingPlanPrices.stripePriceId, stripePriceId))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async create(
    data: CreateBillingPlanPriceData,
  ): Promise<BillingPlanPriceEntity> {
    const [row] = await this.db
      .insert(schema.billingPlanPrices)
      .values({
        planId: data.planId,
        interval: data.interval,
        amountCents: data.amountCents,
        currency: data.currency,
        stripePriceId: data.stripePriceId ?? null,
        lookupKey: data.lookupKey ?? null,
        ...(data.active !== undefined && { active: data.active }),
      })
      .returning();
    return toDomain(row!);
  }

  async updateById(
    id: string,
    data: Partial<Omit<BillingPlanPriceEntity, "id" | "planId" | "createdAt">>,
  ): Promise<BillingPlanPriceEntity> {
    const [row] = await this.db
      .update(schema.billingPlanPrices)
      .set({
        ...(data.interval !== undefined && { interval: data.interval }),
        ...(data.amountCents !== undefined && {
          amountCents: data.amountCents,
        }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.stripePriceId !== undefined && {
          stripePriceId: data.stripePriceId,
        }),
        ...(data.lookupKey !== undefined && { lookupKey: data.lookupKey }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.lastSyncedAt !== undefined && {
          lastSyncedAt: data.lastSyncedAt,
        }),
        updatedAt: new Date(),
      })
      .where(eq(schema.billingPlanPrices.id, id))
      .returning();
    return toDomain(row!);
  }

  async deactivateById(id: string): Promise<void> {
    await this.db
      .update(schema.billingPlanPrices)
      .set({ active: false, lookupKey: null, updatedAt: new Date() })
      .where(eq(schema.billingPlanPrices.id, id));
  }
}
