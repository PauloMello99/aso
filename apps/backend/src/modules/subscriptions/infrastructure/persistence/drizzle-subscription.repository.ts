import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNotNull, lt, ne, or } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  BillingInterval,
  SubscriptionEntity,
  SubscriptionStatus,
  SubscriptionType,
} from "../../domain/subscription.entity";
import {
  CreateSubscriptionData,
  ISubscriptionRepository,
  UpdateSubscriptionData,
} from "../../domain/subscription.repository.interface";

type SubscriptionRow = typeof schema.subscriptions.$inferSelect;

function toDomain(row: SubscriptionRow): SubscriptionEntity {
  return SubscriptionEntity.create({
    id: row.id,
    orgId: row.orgId,
    stripeCustomerId: row.stripeCustomerId ?? null,
    stripeSubscriptionId: row.stripeSubscriptionId ?? null,
    type: row.type as SubscriptionType,
    status: row.status as SubscriptionStatus,
    billingInterval: (row.billingInterval as BillingInterval) ?? null,
    priceCents: row.priceCents ?? null,
    stripePriceId: row.stripePriceId ?? null,
    stripeCouponId: row.stripeCouponId ?? null,
    discountPercent: row.discountPercent ?? null,
    trialEndsAt: row.trialEndsAt ?? null,
    currentPeriodStart: row.currentPeriodStart ?? null,
    currentPeriodEnd: row.currentPeriodEnd ?? null,
    gracePeriodDays: row.gracePeriodDays,
    compReason: row.compReason ?? null,
    compGrantedBy: row.compGrantedBy ?? null,
    compExpiresAt: row.compExpiresAt ?? null,
    canceledAt: row.canceledAt ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    trialConsumed: row.trialConsumed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

@Injectable()
export class DrizzleSubscriptionRepository implements ISubscriptionRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findByOrgId(orgId: string): Promise<SubscriptionEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.orgId, orgId))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<SubscriptionEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.stripeCustomerId, stripeCustomerId))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<SubscriptionEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.subscriptions)
      .where(
        eq(schema.subscriptions.stripeSubscriptionId, stripeSubscriptionId),
      )
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findAllStripeLinked(): Promise<SubscriptionEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          isNotNull(schema.subscriptions.stripeCustomerId),
          isNotNull(schema.subscriptions.stripeSubscriptionId),
        ),
      );
    return rows.map(toDomain);
  }

  async findExpiredComps(): Promise<SubscriptionEntity[]> {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.type, "custom"),
          isNotNull(schema.subscriptions.compExpiresAt),
          lt(schema.subscriptions.compExpiresAt, now),
        ),
      );
    return rows.map(toDomain);
  }

  async findExpiredPastDue(): Promise<SubscriptionEntity[]> {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.status, "past_due"));
    // gracePeriodDays varies per row, so the deadline is computed in
    // application code rather than in SQL. Proxy: currentPeriodEnd (or
    // updatedAt when it is null, e.g. a comp/manual subscription that never
    // had a Stripe period) + gracePeriodDays.
    return rows
      .map(toDomain)
      .filter((sub) => {
        const base = sub.currentPeriodEnd ?? sub.updatedAt;
        const deadline = new Date(
          base.getTime() + sub.gracePeriodDays * 24 * 60 * 60 * 1000,
        );
        return deadline < now;
      });
  }

  async findMigratableByStripePriceId(
    priceId: string,
  ): Promise<SubscriptionEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.stripePriceId, priceId),
          isNotNull(schema.subscriptions.stripeSubscriptionId),
          ne(schema.subscriptions.type, "custom"),
          or(
            eq(schema.subscriptions.status, "active"),
            eq(schema.subscriptions.status, "trialing"),
          ),
        ),
      );
    return rows.map(toDomain);
  }

  async create(data: CreateSubscriptionData): Promise<SubscriptionEntity> {
    const [row] = await this.db
      .insert(schema.subscriptions)
      .values({
        orgId: data.orgId,
        stripeCustomerId: data.stripeCustomerId ?? null,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        type: data.type,
        status: data.status,
        billingInterval: data.billingInterval ?? null,
        priceCents: data.priceCents ?? null,
        stripePriceId: data.stripePriceId ?? null,
        stripeCouponId: data.stripeCouponId ?? null,
        discountPercent: data.discountPercent ?? null,
        trialEndsAt: data.trialEndsAt ?? null,
        currentPeriodStart: data.currentPeriodStart ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        ...(data.gracePeriodDays !== undefined && {
          gracePeriodDays: data.gracePeriodDays,
        }),
        compReason: data.compReason ?? null,
        compGrantedBy: data.compGrantedBy ?? null,
        compExpiresAt: data.compExpiresAt ?? null,
        ...(data.trialConsumed !== undefined && {
          trialConsumed: data.trialConsumed,
        }),
      })
      .returning();
    return toDomain(row!);
  }

  async update(
    orgId: string,
    data: UpdateSubscriptionData,
  ): Promise<SubscriptionEntity> {
    const [row] = await this.db
      .update(schema.subscriptions)
      .set({
        ...(data.stripeCustomerId !== undefined && {
          stripeCustomerId: data.stripeCustomerId,
        }),
        ...(data.stripeSubscriptionId !== undefined && {
          stripeSubscriptionId: data.stripeSubscriptionId,
        }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.billingInterval !== undefined && {
          billingInterval: data.billingInterval,
        }),
        ...(data.priceCents !== undefined && { priceCents: data.priceCents }),
        ...(data.stripePriceId !== undefined && {
          stripePriceId: data.stripePriceId,
        }),
        ...(data.stripeCouponId !== undefined && {
          stripeCouponId: data.stripeCouponId,
        }),
        ...(data.discountPercent !== undefined && {
          discountPercent: data.discountPercent,
        }),
        ...(data.trialEndsAt !== undefined && {
          trialEndsAt: data.trialEndsAt,
        }),
        ...(data.currentPeriodStart !== undefined && {
          currentPeriodStart: data.currentPeriodStart,
        }),
        ...(data.currentPeriodEnd !== undefined && {
          currentPeriodEnd: data.currentPeriodEnd,
        }),
        ...(data.gracePeriodDays !== undefined && {
          gracePeriodDays: data.gracePeriodDays,
        }),
        ...(data.compReason !== undefined && { compReason: data.compReason }),
        ...(data.compGrantedBy !== undefined && {
          compGrantedBy: data.compGrantedBy,
        }),
        ...(data.compExpiresAt !== undefined && {
          compExpiresAt: data.compExpiresAt,
        }),
        ...(data.canceledAt !== undefined && { canceledAt: data.canceledAt }),
        ...(data.cancelAtPeriodEnd !== undefined && {
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        }),
        ...(data.trialConsumed !== undefined && {
          trialConsumed: data.trialConsumed,
        }),
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.orgId, orgId))
      .returning();
    return toDomain(row!);
  }
}
