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
import { BillingCouponCodeAlreadyExistsException } from "../../domain/exceptions/billing-coupon-code-already-exists.exception";

type BillingCouponRow = typeof schema.billingCoupons.$inferSelect;

const CODE_ACTIVE_UNIQUE_INDEX = "billing_coupons_code_active_unique";

// O driver pode entregar o erro do pg direto ou embrulhado em `cause`
// (DrizzleQueryError). Só a violação do índice parcial de código ATIVO
// (migration 0094) é mapeada — qualquer outro erro (inclusive outro 23505,
// como o de stripe_promotion_code_id) segue propagando.
function isActiveCodeUniqueViolation(error: unknown): boolean {
  const candidates: unknown[] = [error];
  if (typeof error === "object" && error !== null && "cause" in error) {
    candidates.push((error as { cause?: unknown }).cause);
  }
  return candidates.some((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return false;
    const { code, constraint } = candidate as {
      code?: unknown;
      constraint?: unknown;
    };
    return code === "23505" && constraint === CODE_ACTIVE_UNIQUE_INDEX;
  });
}

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

type UpsertFromStripeData = {
  stripeCouponId: string;
  name: string;
  duration: string;
} & Partial<
  Omit<
    BillingCouponEntity,
    "id" | "createdAt" | "stripeCouponId" | "name" | "duration"
  >
>;

function normalizeCode(code: string | null): string | null {
  return code === null ? null : code.toUpperCase();
}

@Injectable()
export class DrizzleBillingCouponRepository
  implements IBillingCouponRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  create(data: CreateBillingCouponData): Promise<BillingCouponEntity> {
    return this.mapCodeCollision(() => this.insertRow(data));
  }

  private async insertRow(
    data: CreateBillingCouponData,
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

  /**
   * Retorna o cupom ATIVO que detém o código (o índice único parcial da
   * migration 0094 garante no máximo um). Linhas inativas/arquivadas com o
   * mesmo código não contam: o código pode ser reutilizado (ADR-0040).
   */
  async findByCode(code: string): Promise<BillingCouponEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingCoupons)
      .where(
        and(
          eq(schema.billingCoupons.code, code.toUpperCase()),
          eq(schema.billingCoupons.active, true),
        ),
      )
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

  update(
    id: string,
    data: Partial<Omit<BillingCouponEntity, "id" | "createdAt">>,
  ): Promise<BillingCouponEntity> {
    return this.mapCodeCollision(() => this.updateRow(id, data));
  }

  private async updateRow(
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

  upsertFromStripe(data: UpsertFromStripeData): Promise<BillingCouponEntity> {
    return this.mapCodeCollision(() => this.upsertRow(data));
  }

  // Corrida entre dois ativos com o mesmo código (ex.: criação pelo admin x
  // webhook): o índice parcial estoura 23505 — vira 409, não 500.
  private async mapCodeCollision<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isActiveCodeUniqueViolation(error)) {
        throw new BillingCouponCodeAlreadyExistsException();
      }
      throw error;
    }
  }

  private async upsertRow(
    data: UpsertFromStripeData,
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
