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
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import type {
  NormalizedSubscription,
  SubscriptionEntity,
} from "../../domain/subscription.entity";
import { shouldApplyStripeSync } from "../../domain/subscription-sync";
import { WebhookSignatureInvalidException } from "../../domain/exceptions/webhook-signature-invalid.exception";

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
      case "product.updated":
      case "price.updated":
      case "price.deleted": {
        this.logger.log(
          `Ignoring ${event.type} (catalog sync handled by PlanCatalogService)`,
        );
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
