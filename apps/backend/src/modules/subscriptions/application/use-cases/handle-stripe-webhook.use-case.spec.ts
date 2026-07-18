import type Stripe from "stripe";
import { HandleStripeWebhookUseCase } from "./handle-stripe-webhook.use-case";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { IStripeWebhookEventRepository } from "../../domain/stripe-webhook-event.repository.interface";
import { IBillingInvoiceEventRepository } from "../../domain/billing-invoice-event.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { WebhookSignatureInvalidException } from "../../domain/exceptions/webhook-signature-invalid.exception";

function buildSubscription(
  overrides: Partial<Parameters<typeof SubscriptionEntity.create>[0]> = {},
): SubscriptionEntity {
  return SubscriptionEntity.create({
    id: "sub-1",
    orgId: "org-1",
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_stripe_1",
    type: "standard",
    status: "active",
    billingInterval: "monthly",
    priceCents: 4990,
    stripePriceId: "price_1",
    stripeCouponId: null,
    discountPercent: null,
    trialEndsAt: null,
    currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
    gracePeriodDays: 14,
    compReason: null,
    compGrantedBy: null,
    compExpiresAt: null,
    canceledAt: null,
    trialConsumed: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakePaymentGateway(
  overrides: Partial<jest.Mocked<IPaymentGateway>> = {},
): jest.Mocked<IPaymentGateway> {
  return {
    createCustomer: jest.fn(),
    createCheckoutSession: jest.fn(),
    createPortalSession: jest.fn(),
    findPriceByLookupKey: jest.fn(),
    ensureProduct: jest.fn(),
    createPrice: jest.fn(),
    constructWebhookEvent: jest.fn(),
    getSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    createCoupon: jest.fn(),
    applyCouponToSubscription: jest.fn(),
    removeSubscriptionDiscount: jest.fn(),
    listInvoices: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IPaymentGateway>;
}

function buildFakeSubscriptionRepo(
  overrides: Partial<jest.Mocked<ISubscriptionRepository>> = {},
): jest.Mocked<ISubscriptionRepository> {
  return {
    findByOrgId: jest.fn(),
    findByStripeCustomerId: jest.fn(),
    findByStripeSubscriptionId: jest.fn(),
    findAllStripeLinked: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISubscriptionRepository>;
}

function buildFakeWebhookEventRepo(
  overrides: Partial<jest.Mocked<IStripeWebhookEventRepository>> = {},
): jest.Mocked<IStripeWebhookEventRepository> {
  return {
    claim: jest.fn().mockResolvedValue(true),
    markProcessed: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStripeWebhookEventRepository>;
}

function buildFakeInvoiceEventRepo(
  overrides: Partial<jest.Mocked<IBillingInvoiceEventRepository>> = {},
): jest.Mocked<IBillingInvoiceEventRepository> {
  return {
    create: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingInvoiceEventRepository>;
}

function buildEvent(overrides: Partial<Stripe.Event> = {}): Stripe.Event {
  return {
    id: "evt_1",
    type: "customer.subscription.updated",
    data: { object: { id: "sub_stripe_1" } },
    ...overrides,
  } as unknown as Stripe.Event;
}

describe("HandleStripeWebhookUseCase", () => {
  it("throws WebhookSignatureInvalidException when the signature is invalid", async () => {
    const paymentGateway = buildFakePaymentGateway({
      constructWebhookEvent: jest.fn().mockImplementation(() => {
        throw new Error("bad signature");
      }),
    });
    const webhookEventRepo = buildFakeWebhookEventRepo();

    const useCase = new HandleStripeWebhookUseCase(
      paymentGateway,
      buildFakeSubscriptionRepo(),
      webhookEventRepo,
      buildFakeInvoiceEventRepo(),
    );

    await expect(useCase.execute("raw", "sig")).rejects.toThrow(
      WebhookSignatureInvalidException,
    );
    expect(webhookEventRepo.claim).not.toHaveBeenCalled();
  });

  it("no-ops on a replayed event (claim returns false)", async () => {
    const event = buildEvent();
    const paymentGateway = buildFakePaymentGateway({
      constructWebhookEvent: jest.fn().mockReturnValue(event),
    });
    const webhookEventRepo = buildFakeWebhookEventRepo({
      claim: jest.fn().mockResolvedValue(false),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo();

    const useCase = new HandleStripeWebhookUseCase(
      paymentGateway,
      subscriptionRepo,
      webhookEventRepo,
      buildFakeInvoiceEventRepo(),
    );

    await useCase.execute("raw", "sig");

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
  });

  it("syncs a basic subscription update", async () => {
    const event = buildEvent({ type: "customer.subscription.updated" });
    const current = buildSubscription();
    const normalized = {
      stripeSubscriptionId: "sub_stripe_1",
      stripeCustomerId: "cus_1",
      status: "active" as const,
      billingInterval: "monthly" as const,
      priceCents: 4990,
      stripePriceId: "price_1",
      stripeCouponId: null,
      discountPercent: null,
      trialEndsAt: null,
      currentPeriodStart: new Date("2026-02-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-03-01T00:00:00Z"),
      canceledAt: null,
    };
    const paymentGateway = buildFakePaymentGateway({
      constructWebhookEvent: jest.fn().mockReturnValue(event),
      getSubscription: jest.fn().mockResolvedValue(normalized),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByStripeSubscriptionId: jest.fn().mockResolvedValue(current),
    });
    const webhookEventRepo = buildFakeWebhookEventRepo();

    const useCase = new HandleStripeWebhookUseCase(
      paymentGateway,
      subscriptionRepo,
      webhookEventRepo,
      buildFakeInvoiceEventRepo(),
    );

    await useCase.execute("raw", "sig");

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ status: "active", type: "standard" }),
    );
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith("evt_1");
  });

  it("does not downgrade a comp (custom) subscription via a Stripe sync", async () => {
    const event = buildEvent({ type: "customer.subscription.updated" });
    const current = buildSubscription({ type: "custom", status: "active" });
    const normalized = {
      stripeSubscriptionId: "sub_stripe_1",
      stripeCustomerId: "cus_1",
      status: "canceled" as const,
      billingInterval: null,
      priceCents: null,
      stripePriceId: null,
      stripeCouponId: null,
      discountPercent: null,
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      canceledAt: new Date("2026-02-01T00:00:00Z"),
    };
    const paymentGateway = buildFakePaymentGateway({
      constructWebhookEvent: jest.fn().mockReturnValue(event),
      getSubscription: jest.fn().mockResolvedValue(normalized),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByStripeSubscriptionId: jest.fn().mockResolvedValue(current),
    });
    const webhookEventRepo = buildFakeWebhookEventRepo();

    const useCase = new HandleStripeWebhookUseCase(
      paymentGateway,
      subscriptionRepo,
      webhookEventRepo,
      buildFakeInvoiceEventRepo(),
    );

    await useCase.execute("raw", "sig");

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith("evt_1");
  });

  it("propagates a mid-processing failure instead of swallowing it (so Stripe's retry is not defeated)", async () => {
    // Regression test for the claim-then-crash scenario: the event was
    // claimed (claim() resolves true — either a first delivery, or a retry
    // whose prior attempt never reached markProcessed, per
    // DrizzleStripeWebhookEventRepository.claim()'s reprocess-if-unprocessed
    // semantics), but processing throws before markProcessed runs. The
    // handler must let the error propagate (-> 500 -> Stripe retries again)
    // rather than acknowledging an event it never finished.
    const event = buildEvent({ type: "customer.subscription.updated" });
    const current = buildSubscription();
    const paymentGateway = buildFakePaymentGateway({
      constructWebhookEvent: jest.fn().mockReturnValue(event),
      getSubscription: jest.fn().mockRejectedValue(new Error("stripe timeout")),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByStripeSubscriptionId: jest.fn().mockResolvedValue(current),
    });
    const webhookEventRepo = buildFakeWebhookEventRepo();

    const useCase = new HandleStripeWebhookUseCase(
      paymentGateway,
      subscriptionRepo,
      webhookEventRepo,
      buildFakeInvoiceEventRepo(),
    );

    await expect(useCase.execute("raw", "sig")).rejects.toThrow(
      "stripe timeout",
    );

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
  });
});
