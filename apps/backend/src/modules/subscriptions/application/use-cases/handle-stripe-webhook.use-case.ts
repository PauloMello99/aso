import { Inject, Injectable, Logger } from "@nestjs/common";
import type Stripe from "stripe";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import {
  IStripeWebhookEventRepository,
  STRIPE_WEBHOOK_EVENT_REPOSITORY,
} from "../../domain/stripe-webhook-event.repository.interface";
import {
  IBillingInvoiceEventRepository,
  BILLING_INVOICE_EVENT_REPOSITORY,
} from "../../domain/billing-invoice-event.repository.interface";
import {
  IBillingPlanRepository,
  BILLING_PLAN_REPOSITORY,
  BillingPlanEntity,
} from "../../domain/billing-plan.repository.interface";
import {
  IBillingCouponRepository,
  BILLING_COUPON_REPOSITORY,
} from "../../domain/billing-coupon.repository.interface";
import {
  GatewayPrice,
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import type {
  NormalizedSubscription,
  SubscriptionEntity,
} from "../../domain/subscription.entity";
import { shouldApplyStripeSync } from "../../domain/subscription-sync";
import { WebhookSignatureInvalidException } from "../../domain/exceptions/webhook-signature-invalid.exception";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";

function extractId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function fromUnixSeconds(seconds: number | null | undefined): Date {
  return seconds ? new Date(seconds * 1000) : new Date();
}

@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(STRIPE_WEBHOOK_EVENT_REPOSITORY)
    private readonly webhookEventRepo: IStripeWebhookEventRepository,
    @Inject(BILLING_INVOICE_EVENT_REPOSITORY)
    private readonly invoiceEventRepo: IBillingInvoiceEventRepository,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(BILLING_COUPON_REPOSITORY)
    private readonly billingCouponRepo: IBillingCouponRepository,
    private readonly telemetry: TelemetryService,
  ) {}

  async execute(rawBody: string | Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.paymentGateway.constructWebhookEvent(rawBody, signature);
    } catch (error) {
      throw new WebhookSignatureInvalidException(
        error instanceof Error ? error.message : "Invalid webhook signature",
      );
    }

    const claimed = await this.webhookEventRepo.claim(event.id, event.type);
    if (!claimed) return;

    switch (event.type) {
      case "checkout.session.completed": {
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await this.handleSubscriptionSync(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "customer.subscription.deleted": {
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "product.updated": {
        await this.handleProductUpdated(
          event.data.object as Stripe.Product,
        );
        break;
      }
      case "price.created":
      case "price.updated": {
        await this.handlePriceUpserted(event.data.object as Stripe.Price);
        break;
      }
      case "price.deleted": {
        await this.handlePriceDeleted(event.data.object as Stripe.Price);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        await this.handleInvoiceEvent(
          event.type,
          event.data.object as Stripe.Invoice,
        );
        break;
      }
      case "coupon.created":
      case "coupon.updated": {
        await this.handleCouponUpserted(event.data.object as Stripe.Coupon);
        break;
      }
      case "coupon.deleted": {
        await this.handleCouponDeleted(event.data.object as Stripe.Coupon);
        break;
      }
      case "promotion_code.created":
      case "promotion_code.updated": {
        await this.handlePromotionCodeUpserted(
          event.data.object as Stripe.PromotionCode,
        );
        break;
      }
      default: {
        this.logger.log(`Ignoring unhandled Stripe event type: ${event.type}`);
      }
    }

    await this.webhookEventRepo.markProcessed(event.id);
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const stripeSubscriptionId = extractId(session.subscription);
    if (!stripeSubscriptionId) return;

    const normalized =
      await this.paymentGateway.getSubscription(stripeSubscriptionId);
    if (!normalized) return;

    await this.syncNormalizedSubscription(normalized);
  }

  private async handleSubscriptionSync(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    // Re-fetch and normalize via the gateway rather than parsing the raw
    // event payload again, so the mapping logic stays centralized in
    // StripePaymentGateway.getSubscription.
    const normalized = await this.paymentGateway.getSubscription(
      subscription.id,
    );
    if (!normalized) return;

    await this.syncNormalizedSubscription(normalized);
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const current = await this.findLocalSubscription(
      subscription.id,
      extractId(subscription.customer),
    );
    if (!current) return;

    if (!shouldApplyStripeSync(current, {})) return;

    await this.subscriptionRepo.update(current.orgId, {
      status: "canceled",
      type: "free",
      canceledAt: new Date(),
    });
  }

  private async handleInvoiceEvent(
    eventType: "invoice.paid" | "invoice.payment_failed",
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const customerId = extractId(invoice.customer);
    const local = customerId
      ? await this.subscriptionRepo.findByStripeCustomerId(customerId)
      : null;

    await this.invoiceEventRepo.create({
      stripeInvoiceId: invoice.id,
      orgId: local?.orgId ?? null,
      type: eventType === "invoice.paid" ? "paid" : "payment_failed",
      amountCents:
        eventType === "invoice.paid"
          ? invoice.amount_paid
          : invoice.amount_due,
      currency: invoice.currency,
      occurredAt: fromUnixSeconds(invoice.created),
    });
  }

  /**
   * Mirrors a product edited directly in the Stripe Dashboard back into
   * `billing_plans`. Only reacts to products already tracked locally
   * (`findByStripeProductId`); a product outside our catalog is silently
   * ignored (debug log) rather than warned, since Stripe accounts can host
   * unrelated products.
   */
  private async handleProductUpdated(product: Stripe.Product): Promise<void> {
    const remote = await this.paymentGateway.retrieveProduct(product.id);
    if (!remote) {
      this.logger.log(
        `product.updated for ${product.id}, but it no longer exists in Stripe — skipping`,
      );
      return;
    }

    const plan = await this.billingPlanRepo.findByStripeProductId(
      remote.productId,
    );
    if (!plan) {
      this.logger.debug(
        `product.updated for ${remote.productId} does not belong to our catalog — ignoring`,
      );
      return;
    }

    await this.billingPlanRepo.updateByKey(plan.key, {
      name: remote.name,
      description: remote.description,
      metadata: remote.metadata,
      active: remote.active,
      lastSyncedAt: new Date(),
    });
  }

  /**
   * Handles `price.created`/`price.updated`, mirroring the price back into
   * `billing_plans` when it is the *currently active* price of a plan.
   *
   * CRITICAL: a price rotation performed by our own platform (see
   * RotateBillingPlanPriceUseCase) creates a new Stripe price carrying the
   * plan's `lookup_key` and archives the old one. Archiving an old price
   * fires `price.updated` for it (now `active: false`, lookup_key removed),
   * while creating the new one fires `price.created` for it. A naive handler
   * that accepted any `price.created`/`price.updated` for a price belonging
   * to the plan's product would race the two events and could end up
   * persisting the OLD/ARCHIVED price id as `billing_plans.stripe_price_id`,
   * silently breaking checkout (customers would be charged with an archived
   * price). The discriminator below — `active === true` AND (the price's
   * `lookup_key` matches the plan's `lookup_key` OR it is already the plan's
   * current `stripePriceId`) — ensures only the price that is actually meant
   * to be "the" price of the plan is accepted; the archived leftover from a
   * rotation is ignored.
   */
  private async handlePriceUpserted(price: Stripe.Price): Promise<void> {
    const remote = await this.paymentGateway.retrievePrice(price.id);
    if (!remote) {
      this.logger.log(
        `price.created/updated for ${price.id}, but it no longer exists in Stripe — skipping`,
      );
      return;
    }

    const plan = await this.findPlanForPrice(remote);
    if (!plan) {
      this.logger.debug(
        `price ${remote.priceId} does not belong to our catalog — ignoring`,
      );
      return;
    }

    const isCurrentPlanPrice =
      remote.active &&
      ((plan.lookupKey !== null && remote.lookupKey === plan.lookupKey) ||
        remote.priceId === plan.stripePriceId);
    if (!isCurrentPlanPrice) {
      this.logger.debug(
        `price ${remote.priceId} for plan "${plan.key}" is inactive or its lookup_key does not match the plan's — likely the archived price from a rotation, ignoring`,
      );
      return;
    }

    await this.billingPlanRepo.updateByKey(plan.key, {
      stripePriceId: remote.priceId,
      amountCents: remote.unitAmount ?? plan.amountCents,
      currency: remote.currency,
      // Do not overwrite `interval` from a null remote value — keep the
      // locally known interval in that case.
      ...(remote.interval ? { interval: remote.interval } : {}),
      lastSyncedAt: new Date(),
    });
  }

  /**
   * `price.deleted` is only ever emitted for prices that are archived (Stripe
   * does not allow hard-deleting a price already used in a transaction). If
   * the removed price is the plan's CURRENT price, we deliberately do not
   * clear `stripe_price_id` — doing so would break checkout immediately,
   * which is worse than leaving a (now dashboard-managed) stale reference.
   * Instead we surface it via telemetry/warn log for manual follow-up.
   */
  private async handlePriceDeleted(price: Stripe.Price): Promise<void> {
    const plan = await this.billingPlanRepo.findByStripePriceId(price.id);
    if (!plan) return;
    if (plan.stripePriceId !== price.id) return;

    this.logger.warn(
      `Active price ${price.id} of billing plan "${plan.key}" was deleted/archived directly in Stripe outside the platform`,
    );
    this.telemetry.captureMessage(
      `Billing plan "${plan.key}" active Stripe price was removed outside the platform`,
      "warn",
      {
        module: "subscriptions",
        code: "BILLING_PLAN_ACTIVE_PRICE_DELETED_EXTERNALLY",
        planKey: plan.key,
        stripePriceId: price.id,
      },
    );
  }

  /**
   * Mirrors a coupon created/edited directly in the Stripe Dashboard back
   * into `billing_coupons`. Unlike `handleProductUpdated`, a coupon that
   * does not yet exist locally is NOT ignored: `upsertFromStripe` creates
   * the row in that case, so a coupon set up outside the platform still
   * becomes visible to it (that is the whole point of this handler).
   *
   * `billing_coupons.percent_off` is INTEGER — the platform only ever
   * creates coupons with an integer percentage (see
   * `CreateBillingCouponUseCase.validate`). A coupon created directly in
   * the Stripe Dashboard can carry a fractional `percent_off` (e.g.
   * 33.33%), which is NOT supported by the reverse sync (0047 migration
   * note): we must reject it rather than silently truncating, since
   * truncation would misrepresent the discount actually configured in
   * Stripe.
   */
  private async handleCouponUpserted(coupon: Stripe.Coupon): Promise<void> {
    const remote = await this.paymentGateway.retrieveCoupon(coupon.id);
    if (!remote) {
      this.logger.log(
        `coupon.created/updated for ${coupon.id}, but it no longer exists in Stripe — skipping`,
      );
      return;
    }

    if (remote.percentOff !== null && !Number.isInteger(remote.percentOff)) {
      this.logger.warn(
        `coupon.created/updated for ${remote.couponId} has a fractional percent_off (${remote.percentOff}), which is not supported — ignoring`,
      );
      this.telemetry.captureMessage(
        `Stripe coupon ${remote.couponId} has a fractional percent_off, which is not supported by the reverse sync`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_COUPON_FRACTIONAL_PERCENT_OFF_UNSUPPORTED",
          stripeCouponId: remote.couponId,
          percentOff: remote.percentOff,
        },
      );
      return;
    }

    await this.billingCouponRepo.upsertFromStripe({
      stripeCouponId: remote.couponId,
      name: remote.name,
      percentOff: remote.percentOff,
      amountOffCents: remote.amountOffCents,
      currency: remote.currency,
      duration: remote.duration,
      durationInMonths: remote.durationInMonths,
      lastSyncedAt: new Date(),
    });
  }

  /**
   * `coupon.deleted` never removes the local row — `billing_coupons` keeps
   * historical traceability of which subscriptions used a coupon even after
   * it is deleted in Stripe (append-only-style retention, mirroring the
   * cashier module's own append-only rule). We only flip `active: false`.
   */
  private async handleCouponDeleted(coupon: Stripe.Coupon): Promise<void> {
    const local = await this.billingCouponRepo.findByStripeCouponId(
      coupon.id,
    );
    if (!local) return;

    await this.billingCouponRepo.update(local.id, { active: false });
  }

  /**
   * Mirrors `promotion_code.created`/`promotion_code.updated`. This is the
   * only source of truth for `timesRedeemed` — the platform never
   * increments it locally, it is only ever known via this webhook.
   *
   * A Promotion Code without a matching local Coupon is an inconsistent
   * state (we require the parent Coupon row to exist first, via
   * `handleCouponUpserted` or platform-side creation): logged as a warning
   * rather than treated as an error, since crashing here would defeat
   * Stripe's retry semantics for no benefit.
   */
  private async handlePromotionCodeUpserted(
    promotionCode: Stripe.PromotionCode,
  ): Promise<void> {
    const remote = await this.paymentGateway.retrievePromotionCode(
      promotionCode.id,
    );
    if (!remote) {
      this.logger.log(
        `promotion_code.created/updated for ${promotionCode.id}, but it no longer exists in Stripe — skipping`,
      );
      return;
    }

    const coupon = await this.billingCouponRepo.findByStripeCouponId(
      remote.couponId,
    );
    if (!coupon) {
      this.logger.warn(
        `promotion_code ${remote.promotionCodeId} references coupon ${remote.couponId}, which has no local billing_coupons row — ignoring`,
      );
      return;
    }

    await this.billingCouponRepo.update(coupon.id, {
      stripePromotionCodeId: remote.promotionCodeId,
      code: remote.code,
      active: remote.active,
      maxRedemptions: remote.maxRedemptions,
      timesRedeemed: remote.timesRedeemed,
      expiresAt: remote.expiresAt,
      lastSyncedAt: new Date(),
    });
  }

  /**
   * Locates the local plan row for an incoming Stripe price event. Tries the
   * price id first (the common case), then falls back to the price's
   * product id — this covers a newly-created price during a rotation, which
   * does not yet match `billing_plans.stripe_price_id` but does belong to a
   * tracked product.
   */
  private async findPlanForPrice(
    price: GatewayPrice,
  ): Promise<BillingPlanEntity | null> {
    const byPriceId = await this.billingPlanRepo.findByStripePriceId(
      price.priceId,
    );
    if (byPriceId) return byPriceId;

    return this.billingPlanRepo.findByStripeProductId(price.productId);
  }

  private async syncNormalizedSubscription(
    normalized: NormalizedSubscription,
  ): Promise<void> {
    const current = await this.findLocalSubscription(
      normalized.stripeSubscriptionId,
      normalized.stripeCustomerId,
    );
    if (!current) return;

    if (!shouldApplyStripeSync(current, {})) return;

    await this.subscriptionRepo.update(current.orgId, {
      stripeCustomerId: normalized.stripeCustomerId,
      stripeSubscriptionId: normalized.stripeSubscriptionId,
      status: normalized.status,
      type: normalized.status === "trialing" ? "trial" : "standard",
      billingInterval: normalized.billingInterval,
      priceCents: normalized.priceCents,
      stripePriceId: normalized.stripePriceId,
      stripeCouponId: normalized.stripeCouponId,
      discountPercent: normalized.discountPercent,
      trialEndsAt: normalized.trialEndsAt,
      currentPeriodStart: normalized.currentPeriodStart,
      currentPeriodEnd: normalized.currentPeriodEnd,
      canceledAt: normalized.canceledAt,
    });
  }

  private async findLocalSubscription(
    stripeSubscriptionId: string | null,
    stripeCustomerId: string | null,
  ): Promise<SubscriptionEntity | null> {
    if (stripeSubscriptionId) {
      const bySubscription = await this.subscriptionRepo.findByStripeSubscriptionId(
        stripeSubscriptionId,
      );
      if (bySubscription) return bySubscription;
    }
    if (stripeCustomerId) {
      return this.subscriptionRepo.findByStripeCustomerId(stripeCustomerId);
    }
    return null;
  }
}
