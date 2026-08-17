import type Stripe from "stripe";
import { HandleStripeWebhookUseCase } from "./handle-stripe-webhook.use-case";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { IStripeWebhookEventRepository } from "../../domain/stripe-webhook-event.repository.interface";
import { IBillingInvoiceEventRepository } from "../../domain/billing-invoice-event.repository.interface";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  BillingCouponEntity,
  IBillingCouponRepository,
} from "../../domain/billing-coupon.repository.interface";
import {
  BillingPlanPriceEntity,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { WebhookSignatureInvalidException } from "../../domain/exceptions/webhook-signature-invalid.exception";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";

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
    updateProduct: jest.fn(),
    retrieveProduct: jest.fn(),
    createPrice: jest.fn(),
    archivePrice: jest.fn(),
    retrievePrice: jest.fn(),
    constructWebhookEvent: jest.fn(),
    getSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    updateSubscriptionPrice: jest.fn(),
    createCoupon: jest.fn(),
    applyCouponToSubscription: jest.fn(),
    removeSubscriptionDiscount: jest.fn(),
    retrieveCoupon: jest.fn(),
    deleteCoupon: jest.fn(),
    createPromotionCode: jest.fn(),
    updatePromotionCode: jest.fn(),
    retrievePromotionCode: jest.fn(),
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

function buildFakeBillingPlanRepo(
  overrides: Partial<jest.Mocked<IBillingPlanRepository>> = {},
): jest.Mocked<IBillingPlanRepository> {
  return {
    findByKey: jest.fn(),
    findAll: jest.fn(),
    upsert: jest.fn(),
    findByStripeProductId: jest.fn().mockResolvedValue(null),
    findByStripePriceId: jest.fn().mockResolvedValue(null),
    updateByKey: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanRepository>;
}

function buildFakeBillingPlanPriceRepo(
  overrides: Partial<jest.Mocked<IBillingPlanPriceRepository>> = {},
): jest.Mocked<IBillingPlanPriceRepository> {
  return {
    findActiveByPlanId: jest.fn(),
    findAllByPlanId: jest.fn().mockResolvedValue([]),
    findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
    findByPlanIdAndInterval: jest.fn(),
    findByStripePriceId: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    updateById: jest.fn(),
    deactivateById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanPriceRepository>;
}

function buildBillingPlanPrice(
  overrides: Partial<BillingPlanPriceEntity> = {},
): BillingPlanPriceEntity {
  return {
    id: "plan-price-1",
    planId: "plan-1",
    interval: "monthly",
    amountCents: 4990,
    currency: "brl",
    stripePriceId: "price_current",
    lookupKey: "standard_monthly_lookup",
    active: true,
    lastSyncedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildFakeBillingCouponRepo(
  overrides: Partial<jest.Mocked<IBillingCouponRepository>> = {},
): jest.Mocked<IBillingCouponRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByStripeCouponId: jest.fn().mockResolvedValue(null),
    findByStripePromotionCodeId: jest.fn(),
    findByCode: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    upsertFromStripe: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingCouponRepository>;
}

function buildBillingCoupon(
  overrides: Partial<BillingCouponEntity> = {},
): BillingCouponEntity {
  return {
    id: "coupon-1",
    stripeCouponId: "coupon_stripe_1",
    stripePromotionCodeId: null,
    code: null,
    name: "10% OFF",
    percentOff: 10,
    amountOffCents: null,
    currency: null,
    duration: "once",
    durationInMonths: null,
    maxRedemptions: null,
    timesRedeemed: 0,
    expiresAt: null,
    active: true,
    createdBy: null,
    lastSyncedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildFakeTelemetry(
  overrides: Partial<jest.Mocked<TelemetryService>> = {},
): jest.Mocked<TelemetryService> {
  return {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    flush: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<TelemetryService>;
}

function buildFakeRevalidationClient(
  overrides: Partial<jest.Mocked<FrontendRevalidationClient>> = {},
): jest.Mocked<FrontendRevalidationClient> {
  return {
    revalidate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<FrontendRevalidationClient>;
}

function buildBillingPlan(
  overrides: Partial<BillingPlanEntity> = {},
): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "standard_monthly",
    stripeProductId: "prod_1",
    stripePriceId: "price_current",
    name: "Standard",
    description: "Plano padrão",
    amountCents: 4990,
    currency: "brl",
    interval: "monthly",
    active: true,
    metadata: {},
    lookupKey: "standard_monthly_lookup",
    productKey: "standard",
    lastSyncedAt: null,
    ...overrides,
  };
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
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeBillingPlanPriceRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
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
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeBillingPlanPriceRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
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
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeBillingPlanPriceRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
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
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeBillingPlanPriceRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
    );

    await useCase.execute("raw", "sig");

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith("evt_1");
  });

  it("marks trialConsumed on checkout.session.completed when Stripe confirms a trial happened", async () => {
    const event = buildEvent({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", subscription: "sub_stripe_1" } },
    });
    const current = buildSubscription({ trialConsumed: false });
    const normalized = {
      stripeSubscriptionId: "sub_stripe_1",
      stripeCustomerId: "cus_1",
      status: "trialing" as const,
      billingInterval: "monthly" as const,
      priceCents: 4990,
      stripePriceId: "price_1",
      stripeCouponId: null,
      discountPercent: null,
      trialEndsAt: new Date("2026-03-01T00:00:00Z"),
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
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeBillingPlanPriceRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
    );

    await useCase.execute("raw", "sig");

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ trialConsumed: true }),
    );
  });

  it("still marks trialConsumed on a delayed webhook whose trial already converted", async () => {
    const event = buildEvent({ type: "customer.subscription.updated" });
    const current = buildSubscription({ trialConsumed: false });
    const normalized = {
      stripeSubscriptionId: "sub_stripe_1",
      stripeCustomerId: "cus_1",
      status: "active" as const,
      billingInterval: "monthly" as const,
      priceCents: 4990,
      stripePriceId: "price_1",
      stripeCouponId: null,
      discountPercent: null,
      // trial already converted to a paid period, but trial_end stays populated
      trialEndsAt: new Date("2026-01-15T00:00:00Z"),
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
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeBillingPlanPriceRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
    );

    await useCase.execute("raw", "sig");

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ trialConsumed: true }),
    );
  });

  it("does not include trialConsumed in the update payload when normalized trialEndsAt is null", async () => {
    const event = buildEvent({ type: "customer.subscription.updated" });
    const current = buildSubscription({ trialConsumed: false });
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
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeBillingPlanPriceRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
    );

    await useCase.execute("raw", "sig");

    expect(subscriptionRepo.update).toHaveBeenCalledTimes(1);
    expect(subscriptionRepo.update.mock.calls[0][1]).not.toHaveProperty(
      "trialConsumed",
    );
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
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeBillingPlanPriceRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
    );

    await expect(useCase.execute("raw", "sig")).rejects.toThrow(
      "stripe timeout",
    );

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
  });

  describe("customer.subscription.deleted", () => {
    it("marks trialConsumed when the deleted subscription's trial_end is populated", async () => {
      const event = buildEvent({
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_stripe_1",
            customer: "cus_1",
            trial_end: 1772928000, // 2026-03-08T00:00:00.000Z
          },
        },
      });
      const current = buildSubscription({ trialConsumed: false });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
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
        buildFakeBillingPlanRepo(),
        buildFakeBillingCouponRepo(),
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(subscriptionRepo.update).toHaveBeenCalledWith(
        "org-1",
        expect.objectContaining({
          status: "canceled",
          type: "free",
          trialConsumed: true,
          trialEndsAt: new Date(1772928000 * 1000),
        }),
      );
    });

    it("does not include trialConsumed in the update payload when the deleted subscription's trial_end is null", async () => {
      const event = buildEvent({
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_stripe_1",
            customer: "cus_1",
            trial_end: null,
          },
        },
      });
      const current = buildSubscription({ trialConsumed: false });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
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
        buildFakeBillingPlanRepo(),
        buildFakeBillingCouponRepo(),
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(subscriptionRepo.update).toHaveBeenCalledTimes(1);
      const payload = subscriptionRepo.update.mock.calls[0][1];
      expect(payload).not.toHaveProperty("trialConsumed");
      expect(payload).not.toHaveProperty("trialEndsAt");
      expect(payload).toMatchObject({ status: "canceled", type: "free" });
    });
  });

  describe("product.updated", () => {
    it("updates the local plan when the product exists in our catalog", async () => {
      const event = buildEvent({
        id: "evt_product_updated",
        type: "product.updated",
        data: { object: { id: "prod_1" } },
      });
      const plan = buildBillingPlan();
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrieveProduct: jest.fn().mockResolvedValue({
          productId: "prod_1",
          name: "Standard (renamed)",
          description: "Nova descrição",
          metadata: { foo: "bar" },
          active: true,
        }),
      });
      const billingPlanRepo = buildFakeBillingPlanRepo({
        findByStripeProductId: jest.fn().mockResolvedValue(plan),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();
      const revalidationClient = buildFakeRevalidationClient();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        revalidationClient,
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith(
        plan.key,
        expect.objectContaining({
          name: "Standard (renamed)",
          description: "Nova descrição",
          metadata: { foo: "bar" },
          active: true,
        }),
      );
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_product_updated",
      );
      expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
    });

    it("ignores a product that does not belong to our catalog", async () => {
      const event = buildEvent({
        id: "evt_product_updated_foreign",
        type: "product.updated",
        data: { object: { id: "prod_foreign" } },
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrieveProduct: jest.fn().mockResolvedValue({
          productId: "prod_foreign",
          name: "Foreign product",
          description: null,
          metadata: {},
          active: true,
        }),
      });
      const billingPlanRepo = buildFakeBillingPlanRepo();
      const webhookEventRepo = buildFakeWebhookEventRepo();
      const revalidationClient = buildFakeRevalidationClient();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        revalidationClient,
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_product_updated_foreign",
      );
      expect(revalidationClient.revalidate).not.toHaveBeenCalled();
    });
  });

  describe("price.created / price.updated", () => {
    it("promotes a newly-created price to active when it matches the found row's lookup_key (rotation done outside the platform)", async () => {
      const event = buildEvent({
        id: "evt_price_created",
        type: "price.created",
        data: { object: { id: "price_new" } },
      });
      const oldActiveRow = buildBillingPlanPrice({
        id: "plan-price-old",
        stripePriceId: "price_old",
        lookupKey: "standard_monthly_lookup",
        active: true,
      });
      const newRow = buildBillingPlanPrice({
        id: "plan-price-new",
        stripePriceId: null,
        lookupKey: "standard_monthly_lookup",
        active: false,
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrievePrice: jest.fn().mockResolvedValue({
          priceId: "price_new",
          productId: "prod_1",
          unitAmount: 5990,
          currency: "brl",
          interval: "monthly",
          lookupKey: "standard_monthly_lookup",
          active: true,
        }),
      });
      const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(null),
        findAllByPlanId: jest
          .fn()
          .mockResolvedValue([oldActiveRow, newRow]),
        findActiveByPlanIdAndInterval: jest
          .fn()
          .mockResolvedValue(oldActiveRow),
        updateById: jest
          .fn()
          .mockResolvedValue({ ...newRow, active: true }),
      });
      const billingPlanRepo = buildFakeBillingPlanRepo({
        findByStripeProductId: jest
          .fn()
          .mockResolvedValue(buildBillingPlan({ id: "plan-1" })),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();
      const revalidationClient = buildFakeRevalidationClient();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        billingPlanPriceRepo,
        buildFakeTelemetry(),
        revalidationClient,
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanPriceRepo.deactivateById).toHaveBeenCalledWith(
        oldActiveRow.id,
      );
      expect(billingPlanPriceRepo.updateById).toHaveBeenCalledWith(
        newRow.id,
        expect.objectContaining({
          active: true,
          stripePriceId: "price_new",
          amountCents: 5990,
          currency: "brl",
        }),
      );
      expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
    });

    it("processes a price.created for a non-monthly interval (semiannual) correctly", async () => {
      // Regression test for the HIGH finding: the old discriminator compared
      // against `plan.lookupKey` (single value per plan), which only ever
      // matched ONE interval — any other interval's price event was silently
      // dropped. The fix resolves the row by (plan, interval) via
      // `billing_plan_prices`, so a semiannual price event must be accepted
      // just like monthly.
      const event = buildEvent({
        id: "evt_price_created_semiannual",
        type: "price.created",
        data: { object: { id: "price_semiannual_new" } },
      });
      const oldSemiannualRow = buildBillingPlanPrice({
        id: "plan-price-semiannual-old",
        interval: "semiannual",
        stripePriceId: "price_semiannual_old",
        lookupKey: "standard_semiannual_lookup",
        active: true,
      });
      const newSemiannualRow = buildBillingPlanPrice({
        id: "plan-price-semiannual-new",
        interval: "semiannual",
        stripePriceId: null,
        lookupKey: "standard_semiannual_lookup",
        active: false,
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrievePrice: jest.fn().mockResolvedValue({
          priceId: "price_semiannual_new",
          productId: "prod_1",
          unitAmount: 26940,
          currency: "brl",
          interval: "semiannual",
          lookupKey: "standard_semiannual_lookup",
          active: true,
        }),
      });
      const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(null),
        findAllByPlanId: jest
          .fn()
          .mockResolvedValue([oldSemiannualRow, newSemiannualRow]),
        findActiveByPlanIdAndInterval: jest
          .fn()
          .mockResolvedValue(oldSemiannualRow),
        updateById: jest
          .fn()
          .mockResolvedValue({ ...newSemiannualRow, active: true }),
      });
      const billingPlanRepo = buildFakeBillingPlanRepo({
        findByStripeProductId: jest
          .fn()
          .mockResolvedValue(buildBillingPlan({ id: "plan-1" })),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();
      const revalidationClient = buildFakeRevalidationClient();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        billingPlanPriceRepo,
        buildFakeTelemetry(),
        revalidationClient,
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanPriceRepo.findActiveByPlanIdAndInterval).toHaveBeenCalledWith(
        "plan-1",
        "semiannual",
      );
      expect(billingPlanPriceRepo.deactivateById).toHaveBeenCalledWith(
        oldSemiannualRow.id,
      );
      expect(billingPlanPriceRepo.updateById).toHaveBeenCalledWith(
        newSemiannualRow.id,
        expect.objectContaining({
          active: true,
          stripePriceId: "price_semiannual_new",
          amountCents: 26940,
        }),
      );
      expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
    });

    it("treats a metadata update on the already-active row as a plain drift correction, without touching active/lookupKey", async () => {
      const event = buildEvent({
        id: "evt_price_updated_metadata",
        type: "price.updated",
        data: { object: { id: "price_current" } },
      });
      const activeRow = buildBillingPlanPrice({
        id: "plan-price-1",
        stripePriceId: "price_current",
        lookupKey: "standard_monthly_lookup",
        active: true,
        amountCents: 4990,
        currency: "brl",
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrievePrice: jest.fn().mockResolvedValue({
          priceId: "price_current",
          productId: "prod_1",
          unitAmount: 5990,
          currency: "brl",
          interval: "monthly",
          lookupKey: "standard_monthly_lookup",
          active: true,
        }),
      });
      const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(activeRow),
        findActiveByPlanIdAndInterval: jest
          .fn()
          .mockResolvedValue(activeRow),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();
      const revalidationClient = buildFakeRevalidationClient();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        buildFakeBillingPlanRepo(),
        buildFakeBillingCouponRepo(),
        billingPlanPriceRepo,
        buildFakeTelemetry(),
        revalidationClient,
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanPriceRepo.deactivateById).not.toHaveBeenCalled();
      expect(billingPlanPriceRepo.updateById).toHaveBeenCalledWith(
        activeRow.id,
        expect.objectContaining({ amountCents: 5990 }),
      );
      expect(billingPlanPriceRepo.updateById).toHaveBeenCalledWith(
        activeRow.id,
        expect.not.objectContaining({ active: expect.anything() }),
      );
      expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
    });

    it("ignores the OLD/archived price during a rotation (active: false)", async () => {
      // Critical regression test: a platform-driven rotation archives the
      // old price (price.updated with active:false, lookup_key removed) at
      // roughly the same time it creates the new one. Accepting this event
      // would overwrite the plan_price row with the archived price, breaking
      // checkout.
      const event = buildEvent({
        id: "evt_price_updated_old",
        type: "price.updated",
        data: { object: { id: "price_old" } },
      });
      const row = buildBillingPlanPrice({
        stripePriceId: "price_old",
        lookupKey: null, // lookup_key was moved off this row by the rotation
        active: false,
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrievePrice: jest.fn().mockResolvedValue({
          priceId: "price_old",
          productId: "prod_1",
          unitAmount: 4990,
          currency: "brl",
          interval: "monthly",
          lookupKey: null, // lookup_key was moved off this price by the rotation
          active: false, // archived
        }),
      });
      const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(row),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();
      const revalidationClient = buildFakeRevalidationClient();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        buildFakeBillingPlanRepo(),
        buildFakeBillingCouponRepo(),
        billingPlanPriceRepo,
        buildFakeTelemetry(),
        revalidationClient,
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanPriceRepo.updateById).not.toHaveBeenCalled();
      expect(billingPlanPriceRepo.deactivateById).not.toHaveBeenCalled();
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_price_updated_old",
      );
      expect(revalidationClient.revalidate).not.toHaveBeenCalled();
    });

    it("does NOT match a price by a null lookup_key against a row with a null lookup_key (null !== null for this purpose)", async () => {
      // Regression test: BillingPlanPriceEntity.lookupKey can legitimately be
      // null (a row deactivated by a rotation). `remote.lookupKey ===
      // found.lookupKey` must not treat two nulls as a match — otherwise ANY
      // active price on the product would be accepted, defeating the whole
      // rotation discriminator via a different path.
      const event = buildEvent({
        id: "evt_price_null_lookup_key",
        type: "price.updated",
        data: { object: { id: "price_other" } },
      });
      const row = buildBillingPlanPrice({
        stripePriceId: "price_current",
        lookupKey: null,
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrievePrice: jest.fn().mockResolvedValue({
          priceId: "price_other",
          productId: "prod_1",
          unitAmount: 4990,
          currency: "brl",
          interval: "monthly",
          lookupKey: null,
          active: true,
        }),
      });
      const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(null),
        findAllByPlanId: jest.fn().mockResolvedValue([row]),
      });
      const billingPlanRepo = buildFakeBillingPlanRepo({
        findByStripeProductId: jest
          .fn()
          .mockResolvedValue(buildBillingPlan({ id: "plan-1" })),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        billingPlanPriceRepo,
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanPriceRepo.updateById).not.toHaveBeenCalled();
    });

    it("ignores a price that does not belong to any local plan", async () => {
      const event = buildEvent({
        id: "evt_price_updated_foreign",
        type: "price.updated",
        data: { object: { id: "price_foreign" } },
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrievePrice: jest.fn().mockResolvedValue({
          priceId: "price_foreign",
          productId: "prod_foreign",
          unitAmount: 1990,
          currency: "brl",
          interval: "monthly",
          lookupKey: null,
          active: true,
        }),
      });
      const billingPlanRepo = buildFakeBillingPlanRepo();
      const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        billingPlanPriceRepo,
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanPriceRepo.updateById).not.toHaveBeenCalled();
    });
  });

  describe("price.deleted", () => {
    it("does not clear stripe_price_id when the plan's current price is deleted, only reports it", async () => {
      const event = buildEvent({
        id: "evt_price_deleted",
        type: "price.deleted",
        data: { object: { id: "price_current" } },
      });
      const plan = buildBillingPlan({ stripePriceId: "price_current" });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
      });
      const billingPlanRepo = buildFakeBillingPlanRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(plan),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();
      const telemetry = buildFakeTelemetry();
      const revalidationClient = buildFakeRevalidationClient();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeBillingPlanPriceRepo(),
        telemetry,
        revalidationClient,
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
      expect(telemetry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining(plan.key),
        "warn",
        expect.objectContaining({
          code: "BILLING_PLAN_ACTIVE_PRICE_DELETED_EXTERNALLY",
        }),
      );
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_price_deleted",
      );
      // Even though no row was persisted (deliberately, see doc-comment on
      // handlePriceDeleted), the plan's active price disappearing upstream
      // is user-visible on the pricing page — worth nudging the frontend
      // cache regardless.
      expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
    });

    it("ignores a deleted price that is not the plan's current price", async () => {
      const event = buildEvent({
        id: "evt_price_deleted_stale",
        type: "price.deleted",
        data: { object: { id: "price_stale" } },
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
      });
      const billingPlanRepo = buildFakeBillingPlanRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(null),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();
      const telemetry = buildFakeTelemetry();
      const revalidationClient = buildFakeRevalidationClient();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeBillingPlanPriceRepo(),
        telemetry,
        revalidationClient,
      );

      await useCase.execute("raw", "sig");

      expect(telemetry.captureMessage).not.toHaveBeenCalled();
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_price_deleted_stale",
      );
      expect(revalidationClient.revalidate).not.toHaveBeenCalled();
    });
  });

  describe("coupon.created / coupon.updated", () => {
    it("creates the local row when the coupon does not exist locally (created outside the platform)", async () => {
      const event = buildEvent({
        id: "evt_coupon_created",
        type: "coupon.created",
        data: { object: { id: "coupon_stripe_new" } },
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrieveCoupon: jest.fn().mockResolvedValue({
          couponId: "coupon_stripe_new",
          name: "Dashboard coupon",
          percentOff: 15,
          amountOffCents: null,
          currency: null,
          duration: "once",
          durationInMonths: null,
          valid: true,
        }),
      });
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findByStripeCouponId: jest.fn().mockResolvedValue(null),
        upsertFromStripe: jest.fn().mockResolvedValue(buildBillingCoupon()),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        buildFakeBillingPlanRepo(),
        billingCouponRepo,
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(billingCouponRepo.upsertFromStripe).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeCouponId: "coupon_stripe_new",
          name: "Dashboard coupon",
          percentOff: 15,
          duration: "once",
        }),
      );
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_coupon_created",
      );
    });

    it("updates the local row when the coupon already exists locally", async () => {
      const event = buildEvent({
        id: "evt_coupon_updated",
        type: "coupon.updated",
        data: { object: { id: "coupon_stripe_1" } },
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrieveCoupon: jest.fn().mockResolvedValue({
          couponId: "coupon_stripe_1",
          name: "10% OFF (renamed)",
          percentOff: 10,
          amountOffCents: null,
          currency: null,
          duration: "once",
          durationInMonths: null,
          valid: true,
        }),
      });
      const billingCouponRepo = buildFakeBillingCouponRepo({
        upsertFromStripe: jest
          .fn()
          .mockResolvedValue(buildBillingCoupon({ name: "10% OFF (renamed)" })),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        buildFakeBillingPlanRepo(),
        billingCouponRepo,
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(billingCouponRepo.upsertFromStripe).toHaveBeenCalledWith(
        expect.objectContaining({
          stripeCouponId: "coupon_stripe_1",
          name: "10% OFF (renamed)",
        }),
      );
    });

    it("rejects a fractional percent_off instead of truncating it, without persisting anything", async () => {
      // Regression test for the 0047 migration's documented rule:
      // `billing_coupons.percent_off` is INTEGER — the platform only ever
      // creates coupons with an integer percentage. A coupon created
      // directly in the Stripe Dashboard can carry a fractional
      // `percent_off` (e.g. 33.33%); the handler must reject/ignore it
      // rather than silently truncating.
      const event = buildEvent({
        id: "evt_coupon_fractional",
        type: "coupon.updated",
        data: { object: { id: "coupon_stripe_fractional" } },
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrieveCoupon: jest.fn().mockResolvedValue({
          couponId: "coupon_stripe_fractional",
          name: "Dashboard fractional coupon",
          percentOff: 33.33,
          amountOffCents: null,
          currency: null,
          duration: "once",
          durationInMonths: null,
          valid: true,
        }),
      });
      const billingCouponRepo = buildFakeBillingCouponRepo();
      const webhookEventRepo = buildFakeWebhookEventRepo();
      const telemetry = buildFakeTelemetry();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        buildFakeBillingPlanRepo(),
        billingCouponRepo,
        buildFakeBillingPlanPriceRepo(),
        telemetry,
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(billingCouponRepo.upsertFromStripe).not.toHaveBeenCalled();
      expect(telemetry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining("coupon_stripe_fractional"),
        "warn",
        expect.objectContaining({
          code: "BILLING_COUPON_FRACTIONAL_PERCENT_OFF_UNSUPPORTED",
        }),
      );
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_coupon_fractional",
      );
    });
  });

  describe("coupon.deleted", () => {
    it("deactivates the local row instead of deleting it", async () => {
      const event = buildEvent({
        id: "evt_coupon_deleted",
        type: "coupon.deleted",
        data: { object: { id: "coupon_stripe_1" } },
      });
      const coupon = buildBillingCoupon();
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
      });
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findByStripeCouponId: jest.fn().mockResolvedValue(coupon),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        buildFakeBillingPlanRepo(),
        billingCouponRepo,
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(billingCouponRepo.update).toHaveBeenCalledWith(coupon.id, {
        active: false,
      });
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_coupon_deleted",
      );
    });

    it("ignores a deleted coupon that has no local row", async () => {
      const event = buildEvent({
        id: "evt_coupon_deleted_foreign",
        type: "coupon.deleted",
        data: { object: { id: "coupon_foreign" } },
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
      });
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findByStripeCouponId: jest.fn().mockResolvedValue(null),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        buildFakeBillingPlanRepo(),
        billingCouponRepo,
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(billingCouponRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("promotion_code.created / promotion_code.updated", () => {
    it("persists an incremented timesRedeemed against the matching local coupon", async () => {
      const event = buildEvent({
        id: "evt_promo_updated",
        type: "promotion_code.updated",
        data: { object: { id: "promo_stripe_1" } },
      });
      const coupon = buildBillingCoupon({
        id: "coupon-1",
        stripeCouponId: "coupon_stripe_1",
        timesRedeemed: 3,
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrievePromotionCode: jest.fn().mockResolvedValue({
          promotionCodeId: "promo_stripe_1",
          couponId: "coupon_stripe_1",
          code: "PROMO10",
          active: true,
          maxRedemptions: 100,
          timesRedeemed: 4,
          expiresAt: null,
        }),
      });
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findByStripeCouponId: jest.fn().mockResolvedValue(coupon),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        buildFakeBillingPlanRepo(),
        billingCouponRepo,
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await useCase.execute("raw", "sig");

      expect(billingCouponRepo.update).toHaveBeenCalledWith(
        coupon.id,
        expect.objectContaining({
          timesRedeemed: 4,
          stripePromotionCodeId: "promo_stripe_1",
          code: "PROMO10",
          active: true,
        }),
      );
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_promo_updated",
      );
    });

    it("ignores a promotion code whose coupon has no local row, without throwing", async () => {
      const event = buildEvent({
        id: "evt_promo_orphan",
        type: "promotion_code.updated",
        data: { object: { id: "promo_orphan" } },
      });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrievePromotionCode: jest.fn().mockResolvedValue({
          promotionCodeId: "promo_orphan",
          couponId: "coupon_without_local_row",
          code: "ORPHAN",
          active: true,
          maxRedemptions: null,
          timesRedeemed: 1,
          expiresAt: null,
        }),
      });
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findByStripeCouponId: jest.fn().mockResolvedValue(null),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        buildFakeBillingPlanRepo(),
        billingCouponRepo,
        buildFakeBillingPlanPriceRepo(),
        buildFakeTelemetry(),
        buildFakeRevalidationClient(),
      );

      await expect(useCase.execute("raw", "sig")).resolves.not.toThrow();

      expect(billingCouponRepo.update).not.toHaveBeenCalled();
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_promo_orphan",
      );
    });
  });
});
