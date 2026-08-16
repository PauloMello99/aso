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
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { WebhookSignatureInvalidException } from "../../domain/exceptions/webhook-signature-invalid.exception";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";

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
      buildFakeTelemetry(),
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
      buildFakeTelemetry(),
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
      buildFakeTelemetry(),
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
      buildFakeTelemetry(),
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
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeTelemetry(),
    );

    await expect(useCase.execute("raw", "sig")).rejects.toThrow(
      "stripe timeout",
    );

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
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

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeTelemetry(),
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

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeTelemetry(),
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_product_updated_foreign",
      );
    });
  });

  describe("price.created / price.updated", () => {
    it("accepts a price that is active and whose lookup_key matches the plan's", async () => {
      const event = buildEvent({
        id: "evt_price_created",
        type: "price.created",
        data: { object: { id: "price_new" } },
      });
      const plan = buildBillingPlan({ stripePriceId: "price_old" });
      const paymentGateway = buildFakePaymentGateway({
        constructWebhookEvent: jest.fn().mockReturnValue(event),
        retrievePrice: jest.fn().mockResolvedValue({
          priceId: "price_new",
          productId: "prod_1",
          unitAmount: 5990,
          currency: "brl",
          interval: "monthly",
          lookupKey: plan.lookupKey,
          active: true,
        }),
      });
      const billingPlanRepo = buildFakeBillingPlanRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(null),
        findByStripeProductId: jest.fn().mockResolvedValue(plan),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeTelemetry(),
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith(
        plan.key,
        expect.objectContaining({
          stripePriceId: "price_new",
          amountCents: 5990,
          currency: "brl",
          interval: "monthly",
        }),
      );
    });

    it("ignores the OLD/archived price during a rotation (active: false)", async () => {
      // Critical regression test: a platform-driven rotation archives the
      // old price (price.updated with active:false, lookup_key removed) at
      // roughly the same time it creates the new one. Accepting this event
      // would overwrite billing_plans.stripe_price_id with the archived
      // price, breaking checkout.
      const event = buildEvent({
        id: "evt_price_updated_old",
        type: "price.updated",
        data: { object: { id: "price_old" } },
      });
      const plan = buildBillingPlan({ stripePriceId: "price_old" });
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
      const billingPlanRepo = buildFakeBillingPlanRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(plan),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeTelemetry(),
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_price_updated_old",
      );
    });

    it("does NOT match a price by a null lookup_key against a plan with a null lookup_key (null !== null for this purpose)", async () => {
      // Regression test: BillingPlanEntity.lookupKey can legitimately be
      // null (a plan row that hasn't been through catalog sync yet, per
      // RotateBillingPlanPriceUseCase's own guard against null lookupKey).
      // `remote.lookupKey === plan.lookupKey` must not treat two nulls as a
      // match — otherwise ANY active price on the product would be accepted,
      // defeating the whole rotation discriminator via a different path.
      const event = buildEvent({
        id: "evt_price_null_lookup_key",
        type: "price.updated",
        data: { object: { id: "price_other" } },
      });
      const plan = buildBillingPlan({
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
      const billingPlanRepo = buildFakeBillingPlanRepo({
        findByStripePriceId: jest.fn().mockResolvedValue(null),
        findByStripeProductId: jest.fn().mockResolvedValue(plan),
      });
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeTelemetry(),
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
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
      const webhookEventRepo = buildFakeWebhookEventRepo();

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        buildFakeTelemetry(),
      );

      await useCase.execute("raw", "sig");

      expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
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

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        telemetry,
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

      const useCase = new HandleStripeWebhookUseCase(
        paymentGateway,
        buildFakeSubscriptionRepo(),
        webhookEventRepo,
        buildFakeInvoiceEventRepo(),
        billingPlanRepo,
        buildFakeBillingCouponRepo(),
        telemetry,
      );

      await useCase.execute("raw", "sig");

      expect(telemetry.captureMessage).not.toHaveBeenCalled();
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_price_deleted_stale",
      );
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
        buildFakeTelemetry(),
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
        buildFakeTelemetry(),
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
        telemetry,
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
        buildFakeTelemetry(),
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
        buildFakeTelemetry(),
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
        buildFakeTelemetry(),
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
        buildFakeTelemetry(),
      );

      await expect(useCase.execute("raw", "sig")).resolves.not.toThrow();

      expect(billingCouponRepo.update).not.toHaveBeenCalled();
      expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
        "evt_promo_orphan",
      );
    });
  });
});
