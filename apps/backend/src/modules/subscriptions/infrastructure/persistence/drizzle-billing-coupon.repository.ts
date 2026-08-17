import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  BillingCouponEntity,
  CreateBillingCouponData,
  IBillingCouponRepository,
} from "../../domain/billing-coupon.repository.interface";

type BillingCouponRow = typeof schema.billingCoupons.$inferSelect;

function toDomain(row: BillingCouponRow): BillingCouponEntity {
  return {
    id: row.id,
    stripeCouponId: row.stripeCouponId,
    stripePromotionCodeId: row.stripePromotionCodeId ?? null,
    code: row.code ?? null,
    name: row.name,
    percentOff: row.percentOff ?? null,
    amountOffCents: row.amountOffCents ?? null,
    currency: row.currency ?? null,
    duration: row.duration,
    durationInMonths: row.durationInMonths ?? null,
    maxRedemptions: row.maxRedemptions ?? null,
    timesRedeemed: row.timesRedeemed,
    expiresAt: row.expiresAt ?? null,
    active: row.active,
    createdBy: row.createdBy ?? null,
    lastSyncedAt: row.lastSyncedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeCode(code: string | null): string | null {
  return code === null ? null : code.toUpperCase();
}

@Injectable()
export class DrizzleBillingCouponRepository
  implements IBillingCouponRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async create(data: CreateBillingCouponData): Promise<BillingCouponEntity> {
    const [row] = await this.db
      .insert(schema.billingCoupons)
      .values({
        stripeCouponId: data.stripeCouponId,
        stripePromotionCodeId: data.stripePromotionCodeId ?? null,
        code: normalizeCode(data.code ?? null),
        name: data.name,
        percentOff: data.percentOff ?? null,
        amountOffCents: data.amountOffCents ?? null,
        currency: data.currency ?? null,
        duration: data.duration,
        durationInMonths: data.durationInMonths ?? null,
        maxRedemptions: data.maxRedemptions ?? null,
        expiresAt: data.expiresAt ?? null,
        createdBy: data.createdBy ?? null,
      })
      .returning();
    return toDomain(row!);
  }

  async findById(id: string): Promise<BillingCouponEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingCoupons)
      .where(eq(schema.billingCoupons.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByStripeCouponId(
    stripeCouponId: string,
  ): Promise<BillingCouponEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingCoupons)
      .where(eq(schema.billingCoupons.stripeCouponId, stripeCouponId))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByStripePromotionCodeId(
    stripePromotionCodeId: string,
  ): Promise<BillingCouponEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingCoupons)
      .where(
        eq(schema.billingCoupons.stripePromotionCodeId, stripePromotionCodeId),
      )
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByCode(code: string): Promise<BillingCouponEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingCoupons)
      .where(eq(schema.billingCoupons.code, code.toUpperCase()))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findAll(filters?: { active?: boolean }): Promise<BillingCouponEntity[]> {
    const conditions =
      filters?.active !== undefined
        ? [eq(schema.billingCoupons.active, filters.active)]
        : [];
    const rows = await this.db
      .select()
      .from(schema.billingCoupons)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return rows.map(toDomain);
  }

  async update(
    id: string,
    data: Partial<Omit<BillingCouponEntity, "id" | "createdAt">>,
  ): Promise<BillingCouponEntity> {
    const [row] = await this.db
      .update(schema.billingCoupons)
      .set({
        ...(data.stripeCouponId !== undefined && {
          stripeCouponId: data.stripeCouponId,
        }),
        ...(data.stripePromotionCodeId !== undefined && {
          stripePromotionCodeId: data.stripePromotionCodeId,
        }),
        ...(data.code !== undefined && { code: normalizeCode(data.code) }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.percentOff !== undefined && {
          percentOff: data.percentOff,
        }),
        ...(data.amountOffCents !== undefined && {
          amountOffCents: data.amountOffCents,
        }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.durationInMonths !== undefined && {
          durationInMonths: data.durationInMonths,
        }),
        ...(data.maxRedemptions !== undefined && {
          maxRedemptions: data.maxRedemptions,
        }),
        ...(data.timesRedeemed !== undefined && {
          timesRedeemed: data.timesRedeemed,
        }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.createdBy !== undefined && { createdBy: data.createdBy }),
        ...(data.lastSyncedAt !== undefined && {
          lastSyncedAt: data.lastSyncedAt,
        }),
        updatedAt: new Date(),
      })
      .where(eq(schema.billingCoupons.id, id))
      .returning();
    return toDomain(row!);
  }

  async upsertFromStripe(
    data: { stripeCouponId: string; name: string; duration: string } & Partial<
      Omit<
        BillingCouponEntity,
        "id" | "createdAt" | "stripeCouponId" | "name" | "duration"
      >
    >,
  ): Promise<BillingCouponEntity> {
    const [row] = await this.db
      .insert(schema.billingCoupons)
      .values({
        stripeCouponId: data.stripeCouponId,
        stripePromotionCodeId: data.stripePromotionCodeId ?? null,
        code: normalizeCode(data.code ?? null),
        name: data.name,
        percentOff: data.percentOff ?? null,
        amountOffCents: data.amountOffCents ?? null,
        currency: data.currency ?? null,
        duration: data.duration,
        durationInMonths: data.durationInMonths ?? null,
        maxRedemptions: data.maxRedemptions ?? null,
        ...(data.timesRedeemed !== undefined && {
          timesRedeemed: data.timesRedeemed,
        }),
        expiresAt: data.expiresAt ?? null,
        ...(data.active !== undefined && { active: data.active }),
        createdBy: data.createdBy ?? null,
        lastSyncedAt: data.lastSyncedAt ?? null,
      })
      .onConflictDoUpdate({
        target: schema.billingCoupons.stripeCouponId,
        set: {
          ...(data.stripePromotionCodeId !== undefined && {
            stripePromotionCodeId: data.stripePromotionCodeId,
          }),
          ...(data.code !== undefined && { code: normalizeCode(data.code) }),
          name: data.name,
          ...(data.percentOff !== undefined && {
            percentOff: data.percentOff,
          }),
          ...(data.amountOffCents !== undefined && {
            amountOffCents: data.amountOffCents,
          }),
          ...(data.currency !== undefined && { currency: data.currency }),
          duration: data.duration,
          ...(data.durationInMonths !== undefined && {
            durationInMonths: data.durationInMonths,
          }),
          ...(data.maxRedemptions !== undefined && {
            maxRedemptions: data.maxRedemptions,
          }),
          ...(data.timesRedeemed !== undefined && {
            timesRedeemed: data.timesRedeemed,
          }),
          ...(data.expiresAt !== undefined && {
            expiresAt: data.expiresAt,
          }),
          ...(data.active !== undefined && { active: data.active }),
          ...(data.createdBy !== undefined && { createdBy: data.createdBy }),
          ...(data.lastSyncedAt !== undefined && {
            lastSyncedAt: data.lastSyncedAt,
          }),
          updatedAt: new Date(),
        },
      })
      .returning();
    return toDomain(row!);
  }
}
