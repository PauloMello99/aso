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
  IBillingRefundEventRepository,
  BILLING_REFUND_EVENT_REPOSITORY,
} from "../../domain/billing-refund-event.repository.interface";
import { toRefundEventStatus } from "../../domain/refund-event-status";
import {
  IBillingPlanRepository,
  BILLING_PLAN_REPOSITORY,
} from "../../domain/billing-plan.repository.interface";
import {
  IBillingCouponRepository,
  BILLING_COUPON_REPOSITORY,
} from "../../domain/billing-coupon.repository.interface";
import {
  IBillingPlanPriceRepository,
  BILLING_PLAN_PRICE_REPOSITORY,
  BillingPlanPriceEntity,
} from "../../domain/billing-plan-price.repository.interface";
import {
  GatewayPrice,
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import type {
  NormalizedSubscription,
  SubscriptionEntity,
} from "../../domain/subscription.entity";
import {
  shouldApplyStripeSync,
  shouldMarkTrialConsumed,
  shouldSkipStripeStatusOverride,
} from "../../domain/subscription-sync";
import { WebhookSignatureInvalidException } from "../../domain/exceptions/webhook-signature-invalid.exception";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";
import { RefundOrgResolver } from "../refund-org-resolver.service";

function extractId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function fromUnixSeconds(seconds: number | null | undefined): Date {
  return seconds ? new Date(seconds * 1000) : new Date();
}

// Unlike `fromUnixSeconds` above (which coerces a missing value to
// `new Date()` — fine for `invoice.created`, which Stripe always sends),
// `trial_end` legitimately means "no trial" when null/undefined. Coercing it
// to `new Date()` here would make `shouldMarkTrialConsumed` treat every
// subscription as having just had a trial, the opposite of the intent.
function trialEndsAtFromUnixSeconds(
  seconds: number | null | undefined,
): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
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
    @Inject(BILLING_PLAN_PRICE_REPOSITORY)
    private readonly billingPlanPriceRepo: IBillingPlanPriceRepository,
    private readonly telemetry: TelemetryService,
    private readonly revalidationClient: FrontendRevalidationClient,
    @Inject(BILLING_REFUND_EVENT_REPOSITORY)
    private readonly refundEventRepo: IBillingRefundEventRepository,
    private readonly refundOrgResolver: RefundOrgResolver,
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
      case "charge.refunded": {
        await this.handleRefundEvent(event);
        break;
      }
      case "refund.updated": {
        await this.handleRefundUpdated(event);
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

    // A subscription can be deleted before its created/updated events ever
    // arrive locally (e.g. a lost webhook delivery), leaving
    // stripeSubscriptionId null on the local row. In that case
    // ReconcileSubscriptionsUseCase's cron can never reach it either —
    // findAllStripeLinked() requires stripeSubscriptionId to be non-null —
    // so this event is the ONLY remaining chance to derive trialEndsAt from
    // Stripe and keep trialConsumed accurate.
    const trialEndsAt = trialEndsAtFromUnixSeconds(subscription.trial_end);
    const markTrialConsumed = shouldMarkTrialConsumed(current, {
      trialEndsAt,
    });

    await this.subscriptionRepo.update(current.orgId, {
      status: "canceled",
      type: "free",
      canceledAt: new Date(),
      // The subscription has ended: a leftover cancelAtPeriodEnd=true would be
      // an unfaithful mirror (there is no pending "will cancel" anymore).
      cancelAtPeriodEnd: false,
      ...(markTrialConsumed ? { trialConsumed: true, trialEndsAt } : {}),
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
   * Mirrors `charge.refunded` into `billing_refund_events` — a read-model
   * MIRROR only (the platform never issues a refund itself), one row per
   * `Stripe.Refund` carried on the charge.
   *
   * When the charge's refund list is truncated (`has_more`), the full list is
   * re-fetched from Stripe (`listRefundsByCharge`) and mirrored in place of
   * the partial payload slice; a Stripe failure there degrades to mirroring
   * the partial slice rather than 500-ing the webhook into a retry loop.
   */
  private async handleRefundEvent(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;

    // Distinguish "no refunds key in the payload at all" (the one slice this
    // handler depends on is missing — worth surfacing, like the sibling
    // branches below) from a legitimate empty list (`data: []` — nothing to
    // mirror, silence is fine).
    if (charge.refunds == null) {
      this.logger.warn(
        `charge.refunded: charge ${charge.id} payload carries no refunds list — nothing to mirror`,
      );
      this.telemetry.captureMessage(
        `Stripe charge ${charge.id} charge.refunded payload has no refunds list`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_REFUND_EVENT_PAYLOAD_MISSING_REFUNDS",
          stripeChargeId: charge.id,
        },
      );
      return;
    }

    const payloadRefunds = charge.refunds.data;
    if (payloadRefunds.length === 0) return;

    // The webhook ENVELOPE's timestamp — the moment we observed this
    // transition — not `refund.created`: sibling rows for the same refund
    // must stay orderable on a single timeline (database-guardian finding).
    const occurredAt = fromUnixSeconds(event.created);

    // Every refund on a charge resolves to the same org, so resolve once and
    // reuse it for every row (payload slice AND the re-fetched list below).
    // `payloadRefunds[0]` is only a lookup hint for step (b) of the
    // resolution; step (c) keys off the charge and subsumes anything it
    // misses. Non-empty is guaranteed by the length check above.
    const orgId = await this.refundOrgResolver.resolve({
      refundId: payloadRefunds[0]!.id,
      chargeId: charge.id,
      customerId: extractId(charge.customer),
      paymentIntentId: extractId(charge.payment_intent),
    });

    if (charge.refunds.has_more === true) {
      try {
        const { refunds, truncated } =
          await this.paymentGateway.listRefundsByCharge(charge.id);

        if (refunds.length > 0) {
          for (const refund of refunds) {
            await this.writeRefundRow({
              refundId: refund.refundId,
              chargeId: refund.chargeId ?? charge.id,
              status: refund.status,
              amountCents: refund.amountCents,
              currency: refund.currency,
              reason: refund.reason,
              occurredAt,
              orgId,
            });
          }

          if (truncated) {
            this.logger.warn(
              `charge.refunded: charge ${charge.id} has more refunds than the scan ceiling — trailing refunds not mirrored`,
            );
            this.telemetry.captureMessage(
              `Stripe charge ${charge.id} exceeded the refund scan ceiling on charge.refunded — trailing refunds not mirrored`,
              "warn",
              {
                module: "subscriptions",
                code: "BILLING_REFUND_EVENT_LIST_TRUNCATED",
                stripeChargeId: charge.id,
              },
            );
          }

          // The re-fetched list is authoritative and already contains the
          // payload slice — do NOT also iterate `payloadRefunds`.
          return;
        }

        // Empty re-fetch (Stripe eventual consistency): fall through and
        // mirror the partial payload slice rather than nothing — but surface
        // it, like the `truncated` and `catch` branches, instead of degrading
        // silently.
        this.logger.warn(
          `charge.refunded: charge ${charge.id} refund backfill returned an empty list (Stripe eventual consistency) — mirroring the partial payload slice instead`,
        );
        this.telemetry.captureMessage(
          `Stripe charge ${charge.id} refund backfill returned an empty list on charge.refunded — mirrored only the partial payload slice`,
          "warn",
          {
            module: "subscriptions",
            code: "BILLING_REFUND_EVENT_BACKFILL_EMPTY",
            stripeChargeId: charge.id,
          },
        );
      } catch (error) {
        this.logger.warn(
          `charge.refunded: charge ${charge.id} refund backfill failed (${
            error instanceof Error ? error.message : "unknown error"
          }) — mirroring the partial payload slice instead`,
        );
        this.telemetry.captureMessage(
          `Stripe charge ${charge.id} refund backfill failed on charge.refunded — mirrored only the partial payload slice`,
          "warn",
          {
            module: "subscriptions",
            code: "BILLING_REFUND_EVENT_BACKFILL_FAILED",
            stripeChargeId: charge.id,
          },
        );
        // Fall through to the partial-payload path below.
      }
    }

    for (const refund of payloadRefunds) {
      await this.writeRefundRow({
        refundId: refund.id,
        chargeId: extractId(refund.charge) ?? charge.id,
        status: refund.status,
        amountCents: refund.amount,
        currency: refund.currency,
        reason: refund.reason ?? null,
        occurredAt,
        orgId,
      });
    }
  }

  /**
   * `refund.updated` covers a refund's asynchronous state transitions
   * (`pending` -> `succeeded`/`failed`/`canceled`). We deliberately do NOT
   * consume `refund.created` (it arrives alongside `charge.refunded` in this
   * platform's flow, which already mirrors the first row) nor
   * `charge.refund.updated` (a payment-method-scoped variant — `refund.updated`
   * fires for every refund).
   */
  private async handleRefundUpdated(event: Stripe.Event): Promise<void> {
    const refund = event.data.object as Stripe.Refund;
    const chargeId = extractId(refund.charge);
    const occurredAt = fromUnixSeconds(event.created);

    // A standalone `Stripe.Refund` has no `customer` — it only reaches an org
    // via its charge, so `customerId` is always null here. When `charge` is
    // null in the payload, `payment_intent` is the fallback correlation path.
    const orgId = await this.refundOrgResolver.resolve({
      refundId: refund.id,
      chargeId,
      customerId: null,
      paymentIntentId: extractId(refund.payment_intent),
    });

    await this.writeRefundRow({
      refundId: refund.id,
      chargeId,
      status: refund.status,
      amountCents: refund.amount,
      currency: refund.currency,
      reason: refund.reason ?? null,
      occurredAt,
      orgId,
    });
  }

  /**
   * Builds and persists ONE `billing_refund_events` row. A `status` outside
   * the five we persist (the `billing_refund_events.status` enum) is dropped,
   * not written — an unknown enum value would fail the INSERT and 500 the
   * webhook in a retry loop.
   */
  private async writeRefundRow(input: {
    refundId: string;
    chargeId: string | null;
    status: string | null;
    amountCents: number;
    currency: string;
    reason: string | null;
    occurredAt: Date;
    orgId: string | null;
  }): Promise<void> {
    const status = toRefundEventStatus(input.status);
    if (!status) {
      this.logger.warn(
        `refund ${input.refundId} has an unmapped status "${input.status}" — skipping this refund`,
      );
      this.telemetry.captureMessage(
        `Stripe refund ${input.refundId} has a status not mapped by the reverse sync`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_REFUND_EVENT_UNKNOWN_STATUS",
          stripeRefundId: input.refundId,
          status: input.status,
        },
      );
      return;
    }

    if (input.orgId === null) {
      // The row is still written (append-only, and the
      // `(stripe_refund_id, status)` uniqueness makes the writer
      // onConflictDoNothing — a later retry will NOT backfill the org), so an
      // unresolved org must be surfaced now rather than left as a silent
      // `org_id: null`. This also covers the swallowed `charges.retrieve`
      // failure in step (d) of `RefundOrgResolver.resolve` (which only logs).
      this.logger.warn(
        `refund ${input.refundId} is being mirrored without a resolved org (charge ${input.chargeId ?? "unknown"}) — the row is written unattributed`,
      );
      this.telemetry.captureMessage(
        `Stripe refund ${input.refundId} is being mirrored into billing_refund_events without a resolved org`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_REFUND_EVENT_ORG_UNRESOLVED",
          stripeRefundId: input.refundId,
          stripeChargeId: input.chargeId,
        },
      );
    }

    await this.refundEventRepo.create({
      stripeRefundId: input.refundId,
      stripeChargeId: input.chargeId,
      orgId: input.orgId,
      status,
      amountCents: input.amountCents,
      currency: input.currency,
      reason: input.reason,
      occurredAt: input.occurredAt,
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

    await this.revalidationClient.revalidate("/");
  }

  /**
   * Handles `price.created`/`price.updated`, mirroring the price back into
   * the matching `billing_plan_prices` row — the per-(plan, interval) price
   * table introduced by the billing_plans/billing_plan_prices split (each
   * plan can have N active prices, one per billing interval).
   *
   * CRITICAL: a price rotation (our own platform's
   * `RotatePlanIntervalPriceUseCase`, or a manual rotation done directly in
   * the Stripe Dashboard) creates a new Stripe price carrying the
   * (plan, interval)'s `lookup_key` and archives the old one. Archiving the
   * old price fires `price.updated` for it (now `active: false`, lookup_key
   * removed), while creating the new one fires `price.created` for it. A
   * naive handler that accepted any `price.created`/`price.updated` for a
   * price belonging to the plan's product would race the two events and
   * could end up persisting the OLD/ARCHIVED price as the active row for
   * that interval, silently breaking checkout. The discriminator below —
   * `active === true` AND (the price's `lookup_key` matches the FOUND ROW's
   * `lookup_key`, not the plan's — a plan has one lookup_key per interval,
   * never one overall — OR it is already that row's current
   * `stripePriceId`) — ensures only the price that is actually meant to be
   * "the" price of that (plan, interval) is accepted; the archived leftover
   * from a rotation is ignored.
   */
  private async handlePriceUpserted(price: Stripe.Price): Promise<void> {
    const remote = await this.paymentGateway.retrievePrice(price.id);
    if (!remote) {
      this.logger.log(
        `price.created/updated for ${price.id}, but it no longer exists in Stripe — skipping`,
      );
      return;
    }

    const found = await this.findBillingPlanPriceForRemotePrice(remote);
    if (!found) {
      this.logger.debug(
        `price ${remote.priceId} does not belong to our catalog — ignoring`,
      );
      return;
    }

    const isCurrentIntervalPrice =
      remote.active &&
      ((found.lookupKey !== null && remote.lookupKey === found.lookupKey) ||
        remote.priceId === found.stripePriceId);
    if (!isCurrentIntervalPrice) {
      this.logger.debug(
        `price ${remote.priceId} for plan_price ${found.id} (interval "${found.interval}") is inactive or its lookup_key does not match the row's — likely the archived price from a rotation, ignoring`,
      );
      return;
    }

    const activeRow = await this.billingPlanPriceRepo.findActiveByPlanIdAndInterval(
      found.planId,
      found.interval,
    );

    let wrote = false;

    if (activeRow && activeRow.id === found.id) {
      // The found row already IS the active row for this (plan, interval) —
      // just a metadata update (e.g. amount/currency edited directly in the
      // Stripe Dashboard). Never touch `active`/`lookupKey` here.
      const patch: Partial<
        Omit<BillingPlanPriceEntity, "id" | "planId" | "createdAt">
      > = {};

      if (remote.unitAmount !== null && remote.unitAmount !== found.amountCents) {
        patch.amountCents = remote.unitAmount;
      }
      if (remote.currency !== found.currency) {
        patch.currency = remote.currency;
      }

      if (Object.keys(patch).length > 0) {
        await this.billingPlanPriceRepo.updateById(found.id, {
          ...patch,
          lastSyncedAt: new Date(),
        });
        wrote = true;
      }
    } else {
      // The found row is a DIFFERENT price than the one currently active for
      // this (plan, interval) — a price that was just created/promoted in
      // Stripe outside our own rotation flow (e.g. rotated directly in the
      // Dashboard). Deactivate the previous active row FIRST (same ordering
      // rule as `RotatePlanIntervalPriceUseCase`/`ReconcilePlanCatalogUseCase`:
      // the partial unique indexes on `billing_plan_prices` are scoped to
      // active rows only), then promote the found row.
      if (activeRow && activeRow.id !== found.id) {
        await this.billingPlanPriceRepo.deactivateById(activeRow.id);
      }

      await this.billingPlanPriceRepo.updateById(found.id, {
        active: true,
        stripePriceId: remote.priceId,
        lookupKey: remote.lookupKey ?? found.lookupKey,
        amountCents: remote.unitAmount ?? found.amountCents,
        currency: remote.currency,
        lastSyncedAt: new Date(),
      });
      wrote = true;
    }

    if (wrote) {
      await this.revalidationClient.revalidate("/");
    }
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

    // No local row was actually persisted here (deliberately — see the
    // doc-comment above), but the catalog's Stripe-side state changed in a
    // way that is user-visible on the pricing page (the plan's active price
    // was archived/removed upstream), so the frontend cache is still worth
    // nudging.
    await this.revalidationClient.revalidate("/");
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
   * Locates the local `billing_plan_prices` row for an incoming Stripe price
   * event. Tries the price id first (the common case — the row already
   * carries this exact `stripePriceId`, whether active or a previously
   * adopted/archived one), then falls back to matching by `lookup_key`
   * within the price's product's plan — this covers a newly-created price
   * during a rotation, which does not yet match any row's
   * `stripePriceId` but shares the (plan, interval)'s `lookup_key`.
   */
  private async findBillingPlanPriceForRemotePrice(
    price: GatewayPrice,
  ): Promise<BillingPlanPriceEntity | null> {
    const byPriceId = await this.billingPlanPriceRepo.findByStripePriceId(
      price.priceId,
    );
    if (byPriceId) return byPriceId;

    if (!price.lookupKey) return null;

    const plan = await this.billingPlanRepo.findByStripeProductId(
      price.productId,
    );
    if (!plan) return null;

    const planPrices = await this.billingPlanPriceRepo.findAllByPlanId(
      plan.id,
    );
    const matches = planPrices.filter(
      (planPrice) =>
        planPrice.lookupKey !== null && planPrice.lookupKey === price.lookupKey,
    );
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0]!;
    // Ambiguous: more than one local row currently holds this lookup_key —
    // can happen mid-rotation, between the row being promoted (still
    // stripePriceId: null, not yet linked to a real Stripe price) and the
    // still-active old row (deactivateById hasn't run yet). Prefer the
    // not-yet-linked row as the target of this event; it's the one waiting
    // to be filled in.
    return matches.find((planPrice) => planPrice.stripePriceId === null) ?? matches[0]!;
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

    // Anti-flap guard (shared with ReconcileSubscriptionsUseCase): a subscription
    // locked locally by ExpireSubscriptionsUseCase (status: canceled) must not be
    // resurrected by a delayed Stripe past_due/canceled event. The whole sync is
    // skipped — writing the other fields would still flip `type` back to
    // standard/trial (see below), partially reviving the row this guard protects.
    if (shouldSkipStripeStatusOverride(current.status, normalized.status)) {
      return;
    }

    // This is now the only runtime path (alongside ReconcileSubscriptionsUseCase's
    // cron) that writes trialConsumed=true — checkout-session creation no longer does.
    const markTrialConsumed = shouldMarkTrialConsumed(current, normalized);

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
      // Write-ALWAYS (unlike `trialConsumed` below, which is write-once): if the
      // user clears the pending cancellation in Stripe, the mirror must go back
      // to false, so this is never wrapped in a conditional spread.
      cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
      ...(markTrialConsumed ? { trialConsumed: true } : {}),
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
