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
  create(data: CreateSubscriptionData): Promise<SubscriptionEntity>;
  update(
    orgId: string,
    data: UpdateSubscriptionData,
  ): Promise<SubscriptionEntity>;
}
