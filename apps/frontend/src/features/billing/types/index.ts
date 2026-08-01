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
