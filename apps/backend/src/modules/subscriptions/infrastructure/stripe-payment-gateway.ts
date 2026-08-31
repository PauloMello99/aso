import Stripe from "stripe";
import { Injectable, Logger } from "@nestjs/common";
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
import { SubscriptionStripeMissingException } from "../domain/exceptions/subscription-stripe-missing.exception";
import { TelemetryService } from "../../../common/telemetry/telemetry.service";

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

/**
 * A subscription's discount as it appears on the (expanded) Stripe payload,
 * before any coupon resolution.
 *
 * - `unexpanded`: `discounts[0]` came back as a bare `di_...` id (NOT a coupon
 *   id) because `expand: ["discounts"]` was missing or did not take effect.
 * - `coupon_id`: the discount is expanded, but its `source.coupon` is still a
 *   bare coupon id — Stripe expansion is not recursive, so this is the common
 *   case even with `expand: ["discounts"]`.
 */
export type SubscriptionDiscountRef =
  | { kind: "none" }
  | { kind: "unexpanded" }
  | { kind: "coupon_id"; couponId: string }
  | { kind: "coupon"; coupon: Stripe.Coupon };

/**
 * Pure and synchronous: inspects only `subscription.discounts[0]`. Resolving a
 * `coupon_id` to a coupon (an API call) is deliberately left to the caller.
 */
export function extractSubscriptionDiscountRef(
  subscription: Stripe.Subscription,
): SubscriptionDiscountRef {
  const first = subscription.discounts[0];
  if (first === undefined) return { kind: "none" };
  if (typeof first === "string") return { kind: "unexpanded" };

  const coupon = first.source?.coupon;
  if (coupon === undefined || coupon === null) return { kind: "none" };
  if (typeof coupon === "string") {
    return { kind: "coupon_id", couponId: coupon };
  }
  return { kind: "coupon", coupon };
}

/**
 * Pure: maps a resolved coupon onto the mirror's discount columns.
 * `billing`/`subscriptions.discount_percent` is INTEGER, so a fractional
 * `percent_off` or an `amount_off` coupon (`percentOff === null`) yields
 * `discountPercent: null`; the real coupon id is always kept. A non-null
 * `fractionalPercentOff` is surfaced so the caller can warn (precedent:
 * `HandleStripeWebhookUseCase.handleCouponUpserted`).
 */
export function mapCouponToDiscount(
  couponId: string,
  percentOff: number | null,
): {
  stripeCouponId: string;
  discountPercent: number | null;
  fractionalPercentOff: number | null;
} {
  if (percentOff !== null && !Number.isInteger(percentOff)) {
    return {
      stripeCouponId: couponId,
      discountPercent: null,
      fractionalPercentOff: percentOff,
    };
  }
  return {
    stripeCouponId: couponId,
    discountPercent: percentOff,
    fractionalPercentOff: null,
  };
}

export function toNormalizedSubscription(
  subscription: Stripe.Subscription,
  discount: { stripeCouponId: string | null; discountPercent: number | null },
): NormalizedSubscription {
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

  // The discount is resolved by the caller (see
  // `StripePaymentGateway.resolveSubscriptionDiscount`) and passed in already
  // mapped to the mirror's columns.
  const status: SubscriptionStatus = mapStripeStatus(subscription.status);

  return {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId,
    status,
    billingInterval,
    priceCents: price?.unit_amount ?? null,
    stripePriceId: price?.id ?? null,
    stripeCouponId: discount.stripeCouponId,
    discountPercent: discount.discountPercent,
    trialEndsAt: fromUnixSeconds(subscription.trial_end),
    currentPeriodStart: item
      ? fromUnixSeconds(item.current_period_start)
      : null,
    currentPeriodEnd: item ? fromUnixSeconds(item.current_period_end) : null,
    canceledAt: fromUnixSeconds(subscription.canceled_at),
    // stripe@22.3.2 keeps `cancel_at_period_end: boolean` on the Subscription
    // root (unlike `current_period_start/end`, which moved to `items.data[0]`).
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
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
  private readonly logger = new Logger(StripePaymentGateway.name);

  constructor(
    private readonly config: ConfigService,
    private readonly telemetry: TelemetryService,
  ) {
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

  /**
   * Resolves a subscription's discount into the mirror's columns. Requires the
   * subscription to have been retrieved with `expand: ["discounts"]`; the one
   * remaining API call is `coupons.retrieve` for the (common) `coupon_id` case,
   * since Stripe does not expand `discounts[].source.coupon`.
   */
  private async resolveSubscriptionDiscount(
    subscription: Stripe.Subscription,
  ): Promise<{ stripeCouponId: string | null; discountPercent: number | null }> {
    if (subscription.discounts.length > 1) {
      this.logger.warn(
        `Subscription ${subscription.id} carries ${subscription.discounts.length} discounts; only the first is mirrored`,
      );
      this.telemetry.captureMessage(
        `Stripe subscription ${subscription.id} has multiple discounts, which the local mirror does not support`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_SUBSCRIPTION_MULTIPLE_DISCOUNTS_UNSUPPORTED",
          stripeSubscriptionId: subscription.id,
          discountCount: subscription.discounts.length,
        },
      );
    }

    let mapped:
      | {
          stripeCouponId: string;
          discountPercent: number | null;
          fractionalPercentOff: number | null;
        }
      | null = null;

    const ref = extractSubscriptionDiscountRef(subscription);
    switch (ref.kind) {
      case "none":
        return { stripeCouponId: null, discountPercent: null };
      case "unexpanded": {
        this.logger.warn(
          `Subscription ${subscription.id} discount was not expanded; its coupon cannot be mirrored`,
        );
        this.telemetry.captureMessage(
          `Stripe subscription ${subscription.id} discount was not expanded, so its coupon could not be mirrored`,
          "warn",
          {
            module: "subscriptions",
            code: "BILLING_SUBSCRIPTION_DISCOUNT_NOT_EXPANDED",
            stripeSubscriptionId: subscription.id,
          },
        );
        return { stripeCouponId: null, discountPercent: null };
      }
      case "coupon_id": {
        // Refetch is keyed on `kind === "coupon_id"`, never on a null
        // `discountPercent` — null is also the correct mirror value for an
        // `amount_off` coupon.
        let remote: GatewayCoupon | null = null;
        try {
          remote = await this.retrieveCoupon(ref.couponId);
        } catch {
          // `retrieveCoupon` already maps `resource_missing` to `null` (the
          // `remote === null` branch below covers that). Reaching here means a
          // transient failure (429/5xx/network) AFTER the caller already
          // committed its Stripe write, so the coupon id is mirrored with a
          // null discount percent until the next reconcile fills it in.
          this.logger.warn(
            `Coupon ${ref.couponId} on subscription ${subscription.id} could not be resolved due to a transient error; mirroring the coupon id with a null discount percent until the next reconcile`,
          );
          this.telemetry.captureMessage(
            `Stripe coupon ${ref.couponId} on subscription ${subscription.id} could not be resolved due to a transient error; the local mirror is storing the coupon id with a null discount percent until the next reconcile`,
            "warn",
            {
              module: "subscriptions",
              code: "BILLING_COUPON_RESOLUTION_FAILED",
              stripeSubscriptionId: subscription.id,
              stripeCouponId: ref.couponId,
            },
          );
          return { stripeCouponId: ref.couponId, discountPercent: null };
        }
        if (remote === null) {
          return { stripeCouponId: ref.couponId, discountPercent: null };
        }
        mapped = mapCouponToDiscount(remote.couponId, remote.percentOff);
        break;
      }
      case "coupon": {
        mapped = mapCouponToDiscount(
          ref.coupon.id,
          ref.coupon.percent_off ?? null,
        );
        break;
      }
    }

    // `none`/`unexpanded` already returned; both coupon branches assign `mapped`.
    if (!mapped) {
      return { stripeCouponId: null, discountPercent: null };
    }

    if (mapped.fractionalPercentOff !== null) {
      this.logger.warn(
        `Coupon ${mapped.stripeCouponId} on subscription ${subscription.id} has a fractional percent_off (${mapped.fractionalPercentOff}), which is not supported — mirroring the coupon id with a null discount percent`,
      );
      this.telemetry.captureMessage(
        `Stripe coupon ${mapped.stripeCouponId} has a fractional percent_off, which is not supported by the reverse sync`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_COUPON_FRACTIONAL_PERCENT_OFF_UNSUPPORTED",
          stripeCouponId: mapped.stripeCouponId,
          percentOff: mapped.fractionalPercentOff,
        },
      );
    }

    return {
      stripeCouponId: mapped.stripeCouponId,
      discountPercent: mapped.discountPercent,
    };
  }

  private async normalizeSubscription(
    subscription: Stripe.Subscription,
  ): Promise<NormalizedSubscription> {
    return toNormalizedSubscription(
      subscription,
      await this.resolveSubscriptionDiscount(subscription),
    );
  }

  async getSubscription(
    stripeSubscriptionId: string,
  ): Promise<NormalizedSubscription | null> {
    let subscription: Stripe.Subscription;
    try {
      subscription = await this.stripe.subscriptions.retrieve(
        stripeSubscriptionId,
        { expand: ["items.data.price", "discounts"] },
      );
    } catch (error) {
      if (isResourceMissing(error)) return null;
      throw error;
    }

    return await this.normalizeSubscription(subscription);
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

  async updateSubscriptionPrice(
    stripeSubscriptionId: string,
    newPriceId: string,
    options: {
      prorationBehavior: "create_prorations" | "none";
      idempotencyKey: string;
    },
  ): Promise<NormalizedSubscription> {
    const subscription = await this.stripe.subscriptions.retrieve(
      stripeSubscriptionId,
      { expand: ["items.data.price"] },
    );

    if (subscription.items.data.length > 1) {
      throw new Error(
        `Subscription ${stripeSubscriptionId} has multiple items; price migration is only supported for single-item subscriptions`,
      );
    }

    const item = subscription.items.data[0];
    if (!item) {
      throw new Error(
        `Subscription ${stripeSubscriptionId} has no items; cannot migrate price`,
      );
    }

    const updated = await this.stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        items: [{ id: item.id, price: newPriceId }],
        proration_behavior: options.prorationBehavior,
        expand: ["items.data.price", "discounts"],
      },
      { idempotencyKey: options.idempotencyKey },
    );

    return await this.normalizeSubscription(updated);
  }

  async updateSubscriptionCancelAtPeriodEnd(
    stripeSubscriptionId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<NormalizedSubscription> {
    // No `idempotencyKey` here, unlike `updateSubscriptionPrice`: there the
    // key guards against a duplicated proration (a real financial effect);
    // here we only set a boolean to a fixed value, and a deterministic key
    // would let a schedule→resume→schedule cycle inside Stripe's 24h window
    // replay the first request's cached body, writing a state into the mirror
    // that Stripe itself no longer holds.
    let updated: Stripe.Subscription;
    try {
      updated = await this.stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
        expand: ["items.data.price", "discounts"],
      });
    } catch (error) {
      // The subscription was deleted directly in Stripe (outside the platform):
      // surface a domain 409 instead of letting the raw error become an opaque
      // 500 on the owner's button.
      if (isResourceMissing(error)) {
        throw new SubscriptionStripeMissingException();
      }
      throw error;
    }

    return await this.normalizeSubscription(updated);
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

