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
  CreatePromotionCodeParams,
  EnsureProductParams,
  GatewayCoupon,
  GatewayPrice,
  GatewayProduct,
  GatewayPromotionCode,
  IPaymentGateway,
  UpdatePromotionCodeParams,
  UpdateProductParams,
  UpdatedGatewayPromotionCode,
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

function toGatewayProduct(product: Stripe.Product): GatewayProduct {
  return {
    productId: product.id,
    name: product.name,
    description: product.description,
    metadata: product.metadata,
    active: product.active,
  };
}

function toGatewayPrice(price: Stripe.Price): GatewayPrice {
  const productId =
    typeof price.product === "string" ? price.product : price.product.id;
  const interval = price.recurring
    ? mapIntervalFromStripe(
        price.recurring.interval,
        price.recurring.interval_count,
      )
    : null;
  return {
    priceId: price.id,
    productId,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval,
    lookupKey: price.lookup_key ?? null,
    active: price.active,
  };
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
      // Safe to combine with the absence of `discounts` above: Stripe
      // rejects `allow_promotion_codes: true` when `discounts` is also set
      // on the same session, and this session never passes `discounts`.
      allow_promotion_codes: true,
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

  async updateProduct(
    productId: string,
    params: UpdateProductParams,
  ): Promise<GatewayProduct> {
    const updated = await this.stripe.products.update(productId, {
      name: params.name,
      description: params.description,
      metadata: params.metadata,
      active: params.active,
    });
    return toGatewayProduct(updated);
  }

  async retrieveProduct(productId: string): Promise<GatewayProduct | null> {
    try {
      const product = await this.stripe.products.retrieve(productId);
      return toGatewayProduct(product);
    } catch (error) {
      if (isResourceMissing(error)) return null;
      throw error;
    }
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

  async archivePrice(priceId: string): Promise<void> {
    // Prices are immutable in Stripe: this only flips `active`, it does not
    // move the lookup_key (see `transferLookupKey` on createPrice for that).
    await this.stripe.prices.update(priceId, { active: false });
  }

  async retrievePrice(priceId: string): Promise<GatewayPrice | null> {
    try {
      const price = await this.stripe.prices.retrieve(priceId);
      return toGatewayPrice(price);
    } catch (error) {
      if (isResourceMissing(error)) return null;
      throw error;
    }
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
    // Stripe accepts exactly one of `percent_off` / `amount_off` (the latter
    // requires `currency`) — never both — so the two are kept mutually
    // exclusive here instead of always sending percent_off.
    const amountOrPercent =
      params.amountOffCents !== undefined
        ? { amount_off: params.amountOffCents, currency: params.currency }
        : { percent_off: params.percentOff };

    const coupon = await this.stripe.coupons.create({
      ...amountOrPercent,
      duration:
        params.duration ?? (params.durationMonths ? "repeating" : "once"),
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

  async retrieveCoupon(couponId: string): Promise<GatewayCoupon | null> {
    try {
      const coupon = await this.stripe.coupons.retrieve(couponId);
      return {
        couponId: coupon.id,
        name: coupon.name ?? "",
        percentOff: coupon.percent_off ?? null,
        amountOffCents: coupon.amount_off ?? null,
        currency: coupon.currency ?? null,
        duration: coupon.duration,
        durationInMonths: coupon.duration_in_months ?? null,
        valid: coupon.valid,
      };
    } catch (error) {
      if (isResourceMissing(error)) return null;
      throw error;
    }
  }

  async deleteCoupon(couponId: string): Promise<void> {
    // Idempotent, mirroring cancelSubscription: this is used for
    // compensation (roll back a Coupon after a subsequent Promotion Code
    // creation fails), so a coupon that's already gone is not an error.
    try {
      await this.stripe.coupons.del(couponId);
    } catch (error) {
      if (isResourceMissing(error)) return;
      throw error;
    }
  }

  async createPromotionCode(
    params: CreatePromotionCodeParams,
  ): Promise<{ promotionCodeId: string; code: string }> {
    const promotionCode = await this.stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: params.couponId },
      code: params.code,
      max_redemptions: params.maxRedemptions,
      expires_at: params.expiresAt
        ? Math.floor(params.expiresAt.getTime() / 1000)
        : undefined,
    });
    return { promotionCodeId: promotionCode.id, code: promotionCode.code };
  }

  async updatePromotionCode(
    promotionCodeId: string,
    params: UpdatePromotionCodeParams,
  ): Promise<UpdatedGatewayPromotionCode> {
    const promotionCode = await this.stripe.promotionCodes.update(
      promotionCodeId,
      {
        active: params.active,
        metadata: params.metadata,
      },
    );
    return {
      promotionCodeId: promotionCode.id,
      active: promotionCode.active,
      code: promotionCode.code,
      maxRedemptions: promotionCode.max_redemptions ?? null,
      expiresAt: fromUnixSeconds(promotionCode.expires_at),
      timesRedeemed: promotionCode.times_redeemed,
    };
  }

  async retrievePromotionCode(
    promotionCodeId: string,
  ): Promise<GatewayPromotionCode | null> {
    try {
      const promotionCode =
        await this.stripe.promotionCodes.retrieve(promotionCodeId);
      const coupon = promotionCode.promotion.coupon;
      const couponId = typeof coupon === "string" ? coupon : (coupon?.id ?? "");
      return {
        promotionCodeId: promotionCode.id,
        couponId,
        code: promotionCode.code,
        active: promotionCode.active,
        maxRedemptions: promotionCode.max_redemptions ?? null,
        timesRedeemed: promotionCode.times_redeemed,
        expiresAt: fromUnixSeconds(promotionCode.expires_at),
      };
    } catch (error) {
      if (isResourceMissing(error)) return null;
      throw error;
    }
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

