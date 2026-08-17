export type SubscriptionType = "free" | "trial" | "standard" | "custom"

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled"

export type BillingInterval = "monthly" | "semiannual" | "annual"

export interface Subscription {
  id: string
  orgId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  type: SubscriptionType
  status: SubscriptionStatus
  billingInterval: BillingInterval | null
  priceCents: number | null
  stripePriceId: string | null
  stripeCouponId: string | null
  discountPercent: number | null
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  gracePeriodDays: number
  compReason: string | null
  compGrantedBy: string | null
  compExpiresAt: string | null
  canceledAt: string | null
  trialConsumed: boolean
  createdAt: string
  updatedAt: string
}

export interface CheckoutSessionResponse {
  url: string
}

export interface PublicBillingPlanPrice {
  interval: BillingInterval
  amountCents: number
  currency: string
}

export interface PublicBillingPlan {
  key: string
  name: string
  description: string | null
  prices: PublicBillingPlanPrice[]
}

export interface PortalSessionResponse {
  url: string
}

export interface NormalizedInvoice {
  stripeInvoiceId: string
  type: "paid" | "payment_failed"
  amountCents: number
  currency: string
  occurredAt: string
}

export interface BillingPlanPrice {
  id: string
  planId: string
  interval: BillingInterval
  amountCents: number
  currency: string
  stripePriceId: string | null
  lookupKey: string | null
  active: boolean
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BillingPlan {
  id: string
  key: string
  name: string
  description: string | null
  /** @deprecated derivado do primeiro preço ativo monthly; use `prices` */
  amountCents: number
  /** @deprecated derivado do primeiro preço ativo monthly; use `prices` */
  currency: string
  /** @deprecated derivado do primeiro preço ativo monthly; use `prices` */
  interval: BillingInterval
  active: boolean
  stripeProductId: string | null
  /** @deprecated derivado do primeiro preço ativo monthly; use `prices` */
  stripePriceId: string | null
  /** @deprecated derivado do primeiro preço ativo monthly; use `prices` */
  lookupKey: string | null
  productKey: string | null
  metadata: Record<string, string>
  /** @deprecated derivado do primeiro preço ativo monthly; use `prices` */
  lastSyncedAt: string | null
  prices: BillingPlanPrice[]
}

export type CouponDuration = "once" | "repeating" | "forever"

export interface BillingCoupon {
  id: string
  stripeCouponId: string
  stripePromotionCodeId: string | null
  code: string | null
  name: string
  percentOff: number | null
  amountOffCents: number | null
  currency: string | null
  duration: CouponDuration
  durationInMonths: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  expiresAt: string | null
  active: boolean
  createdBy: string | null
  lastSyncedAt: string | null
}

export interface UpdateBillingPlanProductInput {
  name?: string
  description?: string
  active?: boolean
  metadata?: Record<string, string>
}

export interface MigrateSubscribersResult {
  orgId: string
  stripeSubscriptionId: string
  status: "migrated" | "skipped_already_migrated" | "failed"
  error?: string
}

export interface RotatePlanIntervalPriceResult {
  price: BillingPlanPrice
  migration: {
    results: MigrateSubscribersResult[]
  }
}

export interface UpsertPlanIntervalPriceInput {
  interval: BillingInterval
  amountCents: number
  currency: string
}

export interface RotatePlanIntervalPriceInput {
  amountCents: number
  currency?: string
}

export interface CreateBillingCouponInput {
  name: string
  percentOff?: number
  amountOffCents?: number
  currency?: string
  duration: CouponDuration
  durationInMonths?: number
  code?: string
  maxRedemptions?: number
  expiresAt?: string
}
