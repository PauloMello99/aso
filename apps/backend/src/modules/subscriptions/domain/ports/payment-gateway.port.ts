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
  name: string;
  description?: string;
}

export interface CreatePriceParams {
  productId: string;
  amountCents: number;
  currency: string;
  interval: BillingInterval;
  lookupKey: string;
}

export interface CreateCouponParams {
  percentOff: number;
  durationMonths?: number;
  name?: string;
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
  ): Promise<{ priceId: string; productId: string } | null>;

  ensureProduct(params: EnsureProductParams): Promise<{ productId: string }>;

  createPrice(params: CreatePriceParams): Promise<{ priceId: string }>;

  constructWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
  ): Stripe.Event;

  getSubscription(
    stripeSubscriptionId: string,
  ): Promise<NormalizedSubscription | null>;

  cancelSubscription(stripeSubscriptionId: string): Promise<void>;

  createCoupon(params: CreateCouponParams): Promise<{ couponId: string }>;

  applyCouponToSubscription(
    stripeSubscriptionId: string,
    couponId: string,
  ): Promise<void>;

  removeSubscriptionDiscount(stripeSubscriptionId: string): Promise<void>;

  listInvoices(customerId: string): Promise<NormalizedInvoice[]>;
}
