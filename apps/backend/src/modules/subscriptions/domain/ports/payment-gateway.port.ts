import type Stripe from "stripe";
import type {
  BillingInterval,
  NormalizedInvoice,
  NormalizedSubscription,
} from "../subscription.entity";

export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

export interface CreateCustomerParams {
  orgId: string;
  email: string;
  name?: string;
}

export interface CreateCheckoutSessionParams {
  customerId: string;
  priceId?: string;
  lookupKey?: string;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
  paymentMethodCollection?: "always" | "if_required";
}

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export interface EnsureProductParams {
  /** Deterministic Stripe Product id (custom id). */
  id: string;
  name: string;
  description?: string;
}

export interface CreatePriceParams {
  productId: string;
  amountCents: number;
  currency: string;
  interval: BillingInterval;
  lookupKey: string;
  /**
   * When true, moves `lookupKey` from any existing price that currently holds
   * it onto this new price (Stripe prices are immutable, so a price change is
   * modeled as a new price that inherits the lookup_key).
   */
  transferLookupKey?: boolean;
}

export interface CreateCouponParams {
  /**
   * Required unless `amountOffCents` is passed — Stripe accepts exactly one
   * of `percent_off` / `amount_off`, never both.
   */
  percentOff?: number;
  durationMonths?: number;
  name?: string;
  /** Mutually exclusive with `percentOff`; requires `currency`. */
  amountOffCents?: number;
  currency?: string;
  /**
   * Explicit Stripe coupon duration. Takes priority over the
   * `durationMonths`-based derivation (`durationMonths` set → "repeating",
   * otherwise "once") used when this is omitted, preserving the existing
   * `createCoupon`/`applyCouponToSubscription` behavior for current callers.
   */
  duration?: "once" | "repeating" | "forever";
}

export interface CreatePromotionCodeParams {
  couponId: string;
  code?: string;
  maxRedemptions?: number;
  expiresAt?: Date;
}

export interface UpdatePromotionCodeParams {
  active?: boolean;
  metadata?: Record<string, string>;
}

export interface GatewayCoupon {
  couponId: string;
  name: string;
  percentOff: number | null;
  amountOffCents: number | null;
  currency: string | null;
  duration: "once" | "repeating" | "forever";
  durationInMonths: number | null;
  valid: boolean;
}

export interface GatewayPromotionCode {
  promotionCodeId: string;
  couponId: string;
  code: string;
  active: boolean;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: Date | null;
}

export interface UpdatedGatewayPromotionCode {
  promotionCodeId: string;
  active: boolean;
  code: string;
  maxRedemptions: number | null;
  expiresAt: Date | null;
  timesRedeemed: number;
}

export interface UpdateProductParams {
  name?: string;
  description?: string | null;
  metadata?: Record<string, string>;
  active?: boolean;
}

export interface GatewayProduct {
  productId: string;
  name: string;
  description: string | null;
  metadata: Record<string, string>;
  active: boolean;
}

export interface GatewayPrice {
  priceId: string;
  productId: string;
  unitAmount: number | null;
  currency: string;
  interval: BillingInterval | null;
  lookupKey: string | null;
  active: boolean;
}

/**
 * Port for the payment gateway (Stripe). Use-cases depend only on this
 * interface, never on the Stripe SDK directly.
 *
 * `constructWebhookEvent` returns `Stripe.Event` — a pragmatic exception to
 * "no SDK types in domain": it is a pure type (no runtime dependency, no
 * SDK call performed here), and re-declaring Stripe's full event union
 * locally would just duplicate the SDK's own typings without adding safety.
 */
export interface IPaymentGateway {
  createCustomer(params: CreateCustomerParams): Promise<{ customerId: string }>;

  createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<{ url: string; sessionId: string }>;

  createPortalSession(
    params: CreatePortalSessionParams,
  ): Promise<{ url: string }>;

  findPriceByLookupKey(
    lookupKey: string,
  ): Promise<{
    priceId: string;
    productId: string;
    unitAmount: number | null;
  } | null>;

  ensureProduct(params: EnsureProductParams): Promise<{ productId: string }>;

  updateProduct(
    productId: string,
    params: UpdateProductParams,
  ): Promise<GatewayProduct>;

  retrieveProduct(productId: string): Promise<GatewayProduct | null>;

  createPrice(params: CreatePriceParams): Promise<{ priceId: string }>;

  archivePrice(priceId: string): Promise<void>;

  retrievePrice(priceId: string): Promise<GatewayPrice | null>;

  constructWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
  ): Stripe.Event;

  getSubscription(
    stripeSubscriptionId: string,
  ): Promise<NormalizedSubscription | null>;

  cancelSubscription(stripeSubscriptionId: string): Promise<void>;

  updateSubscriptionPrice(
    stripeSubscriptionId: string,
    newPriceId: string,
    options: {
      prorationBehavior: "create_prorations" | "none";
      idempotencyKey: string;
    },
  ): Promise<NormalizedSubscription>;

  createCoupon(params: CreateCouponParams): Promise<{ couponId: string }>;

  applyCouponToSubscription(
    stripeSubscriptionId: string,
    couponId: string,
  ): Promise<void>;

  removeSubscriptionDiscount(stripeSubscriptionId: string): Promise<void>;

  retrieveCoupon(couponId: string): Promise<GatewayCoupon | null>;

  deleteCoupon(couponId: string): Promise<void>;

  createPromotionCode(
    params: CreatePromotionCodeParams,
  ): Promise<{ promotionCodeId: string; code: string }>;

  updatePromotionCode(
    promotionCodeId: string,
    params: UpdatePromotionCodeParams,
  ): Promise<UpdatedGatewayPromotionCode>;

  retrievePromotionCode(
    promotionCodeId: string,
  ): Promise<GatewayPromotionCode | null>;

  listInvoices(customerId: string): Promise<NormalizedInvoice[]>;
}
