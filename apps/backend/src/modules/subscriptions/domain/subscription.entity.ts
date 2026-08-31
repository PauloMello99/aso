export type SubscriptionType = "free" | "trial" | "standard" | "custom";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled";

export type BillingInterval = "monthly" | "semiannual" | "annual";

export interface SubscriptionEntityProps {
  id: string;
  orgId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  type: SubscriptionType;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  priceCents: number | null;
  stripePriceId: string | null;
  stripeCouponId: string | null;
  discountPercent: number | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodDays: number;
  compReason: string | null;
  compGrantedBy: string | null;
  compExpiresAt: Date | null;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;
  trialConsumed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SubscriptionEntity {
  readonly id: string;
  readonly orgId: string;
  readonly stripeCustomerId: string | null;
  readonly stripeSubscriptionId: string | null;
  readonly type: SubscriptionType;
  readonly status: SubscriptionStatus;
  readonly billingInterval: BillingInterval | null;
  readonly priceCents: number | null;
  readonly stripePriceId: string | null;
  readonly stripeCouponId: string | null;
  readonly discountPercent: number | null;
  readonly trialEndsAt: Date | null;
  readonly currentPeriodStart: Date | null;
  readonly currentPeriodEnd: Date | null;
  readonly gracePeriodDays: number;
  readonly compReason: string | null;
  readonly compGrantedBy: string | null;
  readonly compExpiresAt: Date | null;
  readonly canceledAt: Date | null;
  readonly cancelAtPeriodEnd: boolean;
  readonly trialConsumed: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SubscriptionEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.stripeCustomerId = props.stripeCustomerId;
    this.stripeSubscriptionId = props.stripeSubscriptionId;
    this.type = props.type;
    this.status = props.status;
    this.billingInterval = props.billingInterval;
    this.priceCents = props.priceCents;
    this.stripePriceId = props.stripePriceId;
    this.stripeCouponId = props.stripeCouponId;
    this.discountPercent = props.discountPercent;
    this.trialEndsAt = props.trialEndsAt;
    this.currentPeriodStart = props.currentPeriodStart;
    this.currentPeriodEnd = props.currentPeriodEnd;
    this.gracePeriodDays = props.gracePeriodDays;
    this.compReason = props.compReason;
    this.compGrantedBy = props.compGrantedBy;
    this.compExpiresAt = props.compExpiresAt;
    this.canceledAt = props.canceledAt;
    this.cancelAtPeriodEnd = props.cancelAtPeriodEnd;
    this.trialConsumed = props.trialConsumed;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: SubscriptionEntityProps): SubscriptionEntity {
    return new SubscriptionEntity(props);
  }

  get isStripeLinked(): boolean {
    return (
      this.stripeCustomerId !== null && this.stripeSubscriptionId !== null
    );
  }

  get isComp(): boolean {
    return this.type === "custom";
  }

  get isActiveLike(): boolean {
    return this.status === "active" || this.status === "trialing";
  }
}

/**
 * Normalized representation of a Stripe subscription/invoice, produced by
 * IPaymentGateway implementations so the application layer never depends on
 * the Stripe SDK's own shapes.
 */
export interface NormalizedSubscription {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  priceCents: number | null;
  stripePriceId: string | null;
  stripeCouponId: string | null;
  discountPercent: number | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface NormalizedInvoice {
  stripeInvoiceId: string;
  type: "paid" | "payment_failed";
  amountCents: number;
  currency: string;
  occurredAt: Date;
}
