import Stripe from "stripe";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  BillingInterval,
  NormalizedInvoice,
  NormalizedSubscription,
  SubscriptionStatus,
} from "../domain/subscription.entity";
import type {
  CreateCheckoutSessionParams,
  CreateCouponParams,
  CreateCustomerParams,
  CreatePortalSessionParams,
  CreatePriceParams,
  EnsureProductParams,
  IPaymentGateway,
} from "../domain/ports/payment-gateway.port";
import { mapStripeStatus } from "../domain/subscription-sync";

/**
 * `2026-06-24.dahlia` is the exact literal value of the SDK's own
 * `Stripe.ApiVersion` constant (stripe@22.3.2 — see
 * node_modules/stripe/cjs/apiVersion.d.ts). It is the only value that
 * satisfies `Stripe.LatestApiVersion`.
 */
const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-06-24.dahlia";

function fromUnixSeconds(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

function mapIntervalToStripe(interval: BillingInterval): {
  interval: Stripe.PriceCreateParams.Recurring.Interval;
  intervalCount?: number;
} {
  switch (interval) {
    case "annual":
      return { interval: "year" };
    case "semiannual":
      return { interval: "month", intervalCount: 6 };
    case "monthly":
    default:
      return { interval: "month" };
  }
}

function mapIntervalFromStripe(
  interval: string,
  intervalCount: number,
): BillingInterval {
  if (interval === "year") return "annual";
  if (interval === "month" && intervalCount === 6) return "semiannual";
  return "monthly";
}

function isResourceMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "resource_missing"
  );
}

@Injectable()
export class StripePaymentGateway implements IPaymentGateway {
  private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(this.config.getOrThrow<string>("STRIPE_SECRET_KEY"), {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  async createCustomer(
    params: CreateCustomerParams,
  ): Promise<{ customerId: string }> {
    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: { orgId: params.orgId },
    });
    return { customerId: customer.id };
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<{ url: string; sessionId: string }> {
    let priceId = params.priceId;
    if (!priceId && params.lookupKey) {
      const price = await this.findPriceByLookupKey(params.lookupKey);
      priceId = price?.priceId;
    }
    if (!priceId) {
      throw new Error(
        "createCheckoutSession requires either priceId or a resolvable lookupKey",
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: params.customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: params.trialPeriodDays
        ? { trial_period_days: params.trialPeriodDays }
        : undefined,
      payment_method_collection: params.paymentMethodCollection,
    });

    return { url: session.url ?? "", sessionId: session.id };
  }

  async createPortalSession(
    params: CreatePortalSessionParams,
  ): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  async findPriceByLookupKey(
    lookupKey: string,
  ): Promise<{ priceId: string; productId: string; unitAmount: number | null } | null> {
    const result = await this.stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    const price = result.data[0];
    if (!price) return null;
    const productId =
      typeof price.product === "string" ? price.product : price.product.id;
    return { priceId: price.id, productId, unitAmount: price.unit_amount };
  }

  async ensureProduct(
    params: EnsureProductParams,
  ): Promise<{ productId: string }> {
    // Idempotent by deterministic id: retrieve by id, create with that id if
    // missing. Avoids the fragile match-by-name (a rename would orphan it).
    try {
      const existing = await this.stripe.products.retrieve(params.id);
      return { productId: existing.id };
    } catch (error) {
      if (!isResourceMissing(error)) throw error;
    }

    const created = await this.stripe.products.create({
      id: params.id,
      name: params.name,
      description: params.description,
    });
    return { productId: created.id };
  }

  async createPrice(params: CreatePriceParams): Promise<{ priceId: string }> {
    const { interval, intervalCount } = mapIntervalToStripe(params.interval);
    const price = await this.stripe.prices.create({
      product: params.productId,
      unit_amount: params.amountCents,
      currency: params.currency,
      recurring: {
        interval,
        ...(intervalCount ? { interval_count: intervalCount } : {}),
      },
      lookup_key: params.lookupKey,
      // Stripe prices are immutable; moving the lookup_key from the old price
      // onto this one is how a price change is applied.
      ...(params.transferLookupKey ? { transfer_lookup_key: true } : {}),
    });
    return { priceId: price.id };
  }

  constructWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.getOrThrow<string>("STRIPE_WEBHOOK_SECRET"),
    );
  }

  async getSubscription(
    stripeSubscriptionId: string,
  ): Promise<NormalizedSubscription | null> {
    let subscription: Stripe.Subscription;
    try {
      subscription = await this.stripe.subscriptions.retrieve(
        stripeSubscriptionId,
        { expand: ["items.data.price"] },
      );
    } catch (error) {
      if (isResourceMissing(error)) return null;
      throw error;
    }

    const item = subscription.items.data[0];
    const price = item?.price;
    const recurring = price?.recurring;

    const billingInterval: BillingInterval | null = recurring
      ? mapIntervalFromStripe(recurring.interval, recurring.interval_count)
      : null;

    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    // `discounts` on the subscription/item are IDs unless `discounts` is
    // expanded, which we deliberately don't do here: coupon application is
    // tracked locally via applyCouponToSubscription/removeSubscriptionDiscount,
    // so we don't need to resolve them from a fresh retrieve.
    const status: SubscriptionStatus = mapStripeStatus(subscription.status);

    return {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
      status,
      billingInterval,
      priceCents: price?.unit_amount ?? null,
      stripePriceId: price?.id ?? null,
      stripeCouponId: null,
      discountPercent: null,
      trialEndsAt: fromUnixSeconds(subscription.trial_end),
      currentPeriodStart: item
        ? fromUnixSeconds(item.current_period_start)
        : null,
      currentPeriodEnd: item ? fromUnixSeconds(item.current_period_end) : null,
      canceledAt: fromUnixSeconds(subscription.canceled_at),
    };
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.cancel(stripeSubscriptionId);
    } catch (error) {
      // Idempotent: already canceled or gone is not an error for our purposes.
      if (isResourceMissing(error)) return;
      throw error;
    }
  }

  async createCoupon(
    params: CreateCouponParams,
  ): Promise<{ couponId: string }> {
    const coupon = await this.stripe.coupons.create({
      percent_off: params.percentOff,
      duration: params.durationMonths ? "repeating" : "once",
      duration_in_months: params.durationMonths,
      name: params.name,
    });
    return { couponId: coupon.id };
  }

  async applyCouponToSubscription(
    stripeSubscriptionId: string,
    couponId: string,
  ): Promise<void> {
    await this.stripe.subscriptions.update(stripeSubscriptionId, {
      discounts: [{ coupon: couponId }],
    });
  }

  async removeSubscriptionDiscount(
    stripeSubscriptionId: string,
  ): Promise<void> {
    // An empty array is a no-op per the Stripe SDK docs ("If not specified
    // or empty array, it leaves the subscription's discounts unchanged.");
    // only an empty string actually clears the discounts.
    await this.stripe.subscriptions.update(stripeSubscriptionId, {
      discounts: "",
    });
  }

  async listInvoices(customerId: string): Promise<NormalizedInvoice[]> {
    const result = await this.stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    const events: NormalizedInvoice[] = [];
    for (const invoice of result.data) {
      if (invoice.status === "paid") {
        events.push({
          stripeInvoiceId: invoice.id,
          type: "paid",
          amountCents: invoice.amount_paid,
          currency: invoice.currency,
          occurredAt: fromUnixSeconds(invoice.created) ?? new Date(),
        });
      } else if (invoice.status === "open" && invoice.attempted) {
        // An "open" invoice that Stripe has already attempted to collect
        // and did not fully pay represents a failed payment attempt.
        events.push({
          stripeInvoiceId: invoice.id,
          type: "payment_failed",
          amountCents: invoice.amount_due,
          currency: invoice.currency,
          occurredAt: fromUnixSeconds(invoice.created) ?? new Date(),
        });
      }
      // `draft`, `void`, and untouched `open` invoices are intentionally
      // skipped: they don't represent a completed payment or a genuine
      // failed collection attempt.
    }
    return events;
  }
}

