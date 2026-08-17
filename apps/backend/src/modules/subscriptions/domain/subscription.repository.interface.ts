import type {
  BillingInterval,
  SubscriptionEntity,
  SubscriptionStatus,
  SubscriptionType,
} from "./subscription.entity";

export const SUBSCRIPTION_REPOSITORY = Symbol("SUBSCRIPTION_REPOSITORY");

export interface CreateSubscriptionData {
  orgId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  type: SubscriptionType;
  status: SubscriptionStatus;
  billingInterval?: BillingInterval | null;
  priceCents?: number | null;
  stripePriceId?: string | null;
  stripeCouponId?: string | null;
  discountPercent?: number | null;
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  gracePeriodDays?: number;
  compReason?: string | null;
  compGrantedBy?: string | null;
  compExpiresAt?: Date | null;
  trialConsumed?: boolean;
}

export interface UpdateSubscriptionData {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  type?: SubscriptionType;
  status?: SubscriptionStatus;
  billingInterval?: BillingInterval | null;
  priceCents?: number | null;
  stripePriceId?: string | null;
  stripeCouponId?: string | null;
  discountPercent?: number | null;
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  gracePeriodDays?: number;
  compReason?: string | null;
  compGrantedBy?: string | null;
  compExpiresAt?: Date | null;
  canceledAt?: Date | null;
  trialConsumed?: boolean;
}

export interface ISubscriptionRepository {
  findByOrgId(orgId: string): Promise<SubscriptionEntity | null>;
  findByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<SubscriptionEntity | null>;
  findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<SubscriptionEntity | null>;
  findAllStripeLinked(): Promise<SubscriptionEntity[]>;
  /** Comp (custom) subscriptions whose compExpiresAt has already passed. */
  findExpiredComps(): Promise<SubscriptionEntity[]>;
  /**
   * past_due subscriptions whose grace period has already elapsed. Since
   * the schema has no exact "entered past_due at" timestamp, the repository
   * uses `currentPeriodEnd + gracePeriodDays` (or `updatedAt + gracePeriodDays`
   * when currentPeriodEnd is null) as a proxy for that deadline.
   */
  findExpiredPastDue(): Promise<SubscriptionEntity[]>;
  /**
   * Subscriptions eligible for a Stripe price migration: `stripePriceId`
   * matches `priceId`, `stripeSubscriptionId IS NOT NULL`, `type <> 'custom'`
   * (comp subscriptions have no real Stripe billing to migrate, and are
   * already protected from webhook overwrite by `shouldApplyStripeSync`),
   * and `status IN ('active', 'trialing')` — deliberately EXCLUDING
   * `'past_due'` (prorating an already-overdue invoice would generate a
   * confusing charge; past_due subscribers are left for manual/future
   * regularization, out of this scope).
   */
  findMigratableByStripePriceId(priceId: string): Promise<SubscriptionEntity[]>;
  create(data: CreateSubscriptionData): Promise<SubscriptionEntity>;
  update(
    orgId: string,
    data: UpdateSubscriptionData,
  ): Promise<SubscriptionEntity>;
}
