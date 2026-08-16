export const BILLING_COUPON_REPOSITORY = Symbol("BILLING_COUPON_REPOSITORY");

export interface BillingCouponEntity {
  id: string;
  stripeCouponId: string;
  stripePromotionCodeId: string | null;
  code: string | null;
  name: string;
  percentOff: number | null;
  amountOffCents: number | null;
  currency: string | null;
  duration: string;
  durationInMonths: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: Date | null;
  active: boolean;
  createdBy: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBillingCouponData {
  stripeCouponId: string;
  stripePromotionCodeId?: string | null;
  code?: string | null;
  name: string;
  percentOff?: number | null;
  amountOffCents?: number | null;
  currency?: string | null;
  duration: string;
  durationInMonths?: number | null;
  maxRedemptions?: number | null;
  expiresAt?: Date | null;
  createdBy?: string | null;
}

export interface IBillingCouponRepository {
  create(data: CreateBillingCouponData): Promise<BillingCouponEntity>;
  findById(id: string): Promise<BillingCouponEntity | null>;
  findByStripeCouponId(
    stripeCouponId: string,
  ): Promise<BillingCouponEntity | null>;
  findByStripePromotionCodeId(
    stripePromotionCodeId: string,
  ): Promise<BillingCouponEntity | null>;
  findByCode(code: string): Promise<BillingCouponEntity | null>;
  findAll(filters?: { active?: boolean }): Promise<BillingCouponEntity[]>;
  update(
    id: string,
    data: Partial<Omit<BillingCouponEntity, "id" | "createdAt">>,
  ): Promise<BillingCouponEntity>;
  /**
   * Upsert por `stripeCouponId` — usado pela sincronização reversa via
   * webhook (PR futuro): INSERT ... ON CONFLICT(stripe_coupon_id) DO UPDATE.
   * `name` e `duration` são obrigatórios porque as colunas são NOT NULL sem
   * default no banco — cabe ao caller (use-case futuro) decidir como derivar
   * esses valores quando o Stripe não os enviar; o adapter não inventa
   * placeholder.
   */
  upsertFromStripe(
    data: { stripeCouponId: string; name: string; duration: string } & Partial<
      Omit<
        BillingCouponEntity,
        "id" | "createdAt" | "stripeCouponId" | "name" | "duration"
      >
    >,
  ): Promise<BillingCouponEntity>;
}
