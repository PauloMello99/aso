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
    description: row.description ?? null,
    amountCents: row.amountCents,
    currency: row.currency,
    interval: row.interval,
    active: row.active,
    metadata: row.metadata ?? {},
    lookupKey: row.lookupKey ?? null,
    productKey: row.productKey ?? null,
    lastSyncedAt: row.lastSyncedAt ?? null,
    highlighted: row.highlighted,
    features: row.features ?? [],
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

  async findByStripeProductId(
    productId: string,
  ): Promise<BillingPlanEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingPlans)
      .where(eq(schema.billingPlans.stripeProductId, productId))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByStripePriceId(
    priceId: string,
  ): Promise<BillingPlanEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingPlans)
      .where(eq(schema.billingPlans.stripePriceId, priceId))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async upsert(data: UpsertBillingPlanData): Promise<BillingPlanEntity> {
    const [row] = await this.db
      .insert(schema.billingPlans)
      .values({
        key: data.key,
        stripeProductId: data.stripeProductId ?? null,
        stripePriceId: data.stripePriceId ?? null,
        name: data.name,
        description: data.description ?? null,
        amountCents: data.amountCents,
        currency: data.currency,
        interval: data.interval,
        ...(data.active !== undefined && { active: data.active }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        ...(data.highlighted !== undefined && {
          highlighted: data.highlighted,
        }),
        ...(data.features !== undefined && { features: data.features }),
        lookupKey: data.lookupKey ?? null,
        productKey: data.productKey ?? null,
        lastSyncedAt: data.lastSyncedAt ?? null,
      })
      .onConflictDoUpdate({
        target: schema.billingPlans.key,
        // highlighted/features são curadoria de apresentação do super_admin —
        // NUNCA incluir aqui: o sync do Stripe (SyncPlanCatalogUseCase, roda em
        // onModuleInit a partir de PLAN_CATALOG, que não carrega esses campos)
        // apagaria a curadoria a cada boot se estivessem no set do conflito.
        set: {
          stripeProductId: data.stripeProductId ?? null,
          stripePriceId: data.stripePriceId ?? null,
          name: data.name,
          amountCents: data.amountCents,
          currency: data.currency,
          interval: data.interval,
          ...(data.active !== undefined && { active: data.active }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
          ...(data.lookupKey !== undefined && { lookupKey: data.lookupKey }),
          ...(data.productKey !== undefined && { productKey: data.productKey }),
          lastSyncedAt: data.lastSyncedAt ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return toDomain(row!);
  }

  async updateByKey(
    key: string,
    data: Partial<UpsertBillingPlanData>,
  ): Promise<BillingPlanEntity> {
    const [row] = await this.db
      .update(schema.billingPlans)
      .set({
        ...(data.stripeProductId !== undefined && {
          stripeProductId: data.stripeProductId,
        }),
        ...(data.stripePriceId !== undefined && {
          stripePriceId: data.stripePriceId,
        }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.amountCents !== undefined && {
          amountCents: data.amountCents,
        }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.interval !== undefined && { interval: data.interval }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        ...(data.highlighted !== undefined && {
          highlighted: data.highlighted,
        }),
        ...(data.features !== undefined && { features: data.features }),
        ...(data.lookupKey !== undefined && { lookupKey: data.lookupKey }),
        ...(data.productKey !== undefined && { productKey: data.productKey }),
        ...(data.lastSyncedAt !== undefined && {
          lastSyncedAt: data.lastSyncedAt,
        }),
        updatedAt: new Date(),
      })
      .where(eq(schema.billingPlans.key, key))
      .returning();
    return toDomain(row!);
  }
}
