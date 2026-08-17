import { ReconcileSubscriptionsUseCase } from "./reconcile-subscriptions.use-case";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";

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
    findAllStripeLinked: jest.fn().mockResolvedValue([]),
    findExpiredComps: jest.fn(),
    findExpiredPastDue: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISubscriptionRepository>;
}

describe("ReconcileSubscriptionsUseCase", () => {
  it("syncs a subscription that drifted from Stripe (e.g. missed webhook)", async () => {
    const current = buildSubscription({ status: "active" });
    const normalized = {
      stripeSubscriptionId: "sub_stripe_1",
      stripeCustomerId: "cus_1",
      status: "past_due" as const,
      billingInterval: "monthly" as const,
      priceCents: 4990,
      stripePriceId: "price_1",
      stripeCouponId: null,
      discountPercent: null,
      trialEndsAt: null,
      currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
      canceledAt: null,
    };
    const paymentGateway = buildFakePaymentGateway({
      getSubscription: jest.fn().mockResolvedValue(normalized),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findAllStripeLinked: jest.fn().mockResolvedValue([current]),
    });

    const useCase = new ReconcileSubscriptionsUseCase(
      subscriptionRepo,
      paymentGateway,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ status: "past_due", type: "standard" }),
    );
    expect(result).toEqual({ checked: 1, updated: 1, errors: 0 });
  });

  it("treats a subscription deleted in Stripe (getSubscription returns null) as canceled", async () => {
    const current = buildSubscription({ status: "active" });
    const paymentGateway = buildFakePaymentGateway({
      getSubscription: jest.fn().mockResolvedValue(null),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findAllStripeLinked: jest.fn().mockResolvedValue([current]),
    });

    const useCase = new ReconcileSubscriptionsUseCase(
      subscriptionRepo,
      paymentGateway,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ status: "canceled", type: "free" }),
    );
    expect(result.updated).toBe(1);
  });

  it("never downgrades a comp (custom) subscription", async () => {
    const current = buildSubscription({ type: "custom", status: "active" });
    const paymentGateway = buildFakePaymentGateway({
      getSubscription: jest.fn().mockResolvedValue(null),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findAllStripeLinked: jest.fn().mockResolvedValue([current]),
    });

    const useCase = new ReconcileSubscriptionsUseCase(
      subscriptionRepo,
      paymentGateway,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 1, updated: 0, errors: 0 });
  });

  it("does not resurrect a subscription locked locally by the expiry sweep (anti-flap guard)", async () => {
    // Simulates ExpireSubscriptionsUseCase having already locked this org
    // (status: canceled, type: free) for a grace-period breach, without
    // touching Stripe. Stripe still reports past_due.
    const lockedLocally = buildSubscription({
      status: "canceled",
      type: "free",
    });
    const normalized = {
      stripeSubscriptionId: "sub_stripe_1",
      stripeCustomerId: "cus_1",
      status: "past_due" as const,
      billingInterval: "monthly" as const,
      priceCents: 4990,
      stripePriceId: "price_1",
      stripeCouponId: null,
      discountPercent: null,
      trialEndsAt: null,
      currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
      canceledAt: null,
    };
    const paymentGateway = buildFakePaymentGateway({
      getSubscription: jest.fn().mockResolvedValue(normalized),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findAllStripeLinked: jest.fn().mockResolvedValue([lockedLocally]),
    });

    const useCase = new ReconcileSubscriptionsUseCase(
      subscriptionRepo,
      paymentGateway,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 1, updated: 0, errors: 0 });
  });

  it("re-activates a locally-canceled subscription once Stripe reports it paying again", async () => {
    const lockedLocally = buildSubscription({
      status: "canceled",
      type: "free",
    });
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
      currentPeriodStart: new Date("2026-03-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-04-01T00:00:00Z"),
      canceledAt: null,
    };
    const paymentGateway = buildFakePaymentGateway({
      getSubscription: jest.fn().mockResolvedValue(normalized),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findAllStripeLinked: jest.fn().mockResolvedValue([lockedLocally]),
    });

    const useCase = new ReconcileSubscriptionsUseCase(
      subscriptionRepo,
      paymentGateway,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ status: "active", type: "standard" }),
    );
    expect(result.updated).toBe(1);
  });

  it("marks trialConsumed when Stripe confirms a trial happened, even with no other drift", async () => {
    const trialEndsAt = new Date("2026-03-01T00:00:00Z");
    const current = buildSubscription({
      trialConsumed: false,
      trialEndsAt,
    });
    const normalized = {
      stripeSubscriptionId: "sub_stripe_1",
      stripeCustomerId: "cus_1",
      status: "active" as const,
      billingInterval: "monthly" as const,
      priceCents: 4990,
      stripePriceId: "price_1",
      stripeCouponId: null,
      discountPercent: null,
      trialEndsAt,
      currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
      canceledAt: null,
    };
    const paymentGateway = buildFakePaymentGateway({
      getSubscription: jest.fn().mockResolvedValue(normalized),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findAllStripeLinked: jest.fn().mockResolvedValue([current]),
    });

    const useCase = new ReconcileSubscriptionsUseCase(
      subscriptionRepo,
      paymentGateway,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ trialConsumed: true }),
    );
    expect(result.updated).toBe(1);
  });

  it("does not touch an already-consumed trial when there is no other drift", async () => {
    const trialEndsAt = new Date("2026-03-01T00:00:00Z");
    const current = buildSubscription({
      trialConsumed: true,
      trialEndsAt,
    });
    const normalized = {
      stripeSubscriptionId: "sub_stripe_1",
      stripeCustomerId: "cus_1",
      status: "active" as const,
      billingInterval: "monthly" as const,
      priceCents: 4990,
      stripePriceId: "price_1",
      stripeCouponId: null,
      discountPercent: null,
      trialEndsAt,
      currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
      canceledAt: null,
    };
    const paymentGateway = buildFakePaymentGateway({
      getSubscription: jest.fn().mockResolvedValue(normalized),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findAllStripeLinked: jest.fn().mockResolvedValue([current]),
    });

    const useCase = new ReconcileSubscriptionsUseCase(
      subscriptionRepo,
      paymentGateway,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 1, updated: 0, errors: 0 });
  });

  it("continues processing other orgs after a failure on one", async () => {
    const failing = buildSubscription({
      id: "sub-1",
      orgId: "org-1",
      stripeSubscriptionId: "sub_stripe_1",
    });
    const healthy = buildSubscription({
      id: "sub-2",
      orgId: "org-2",
      stripeSubscriptionId: "sub_stripe_2",
    });
    const paymentGateway = buildFakePaymentGateway({
      getSubscription: jest.fn().mockImplementation((id: string) => {
        if (id === "sub_stripe_1") {
          return Promise.reject(new Error("stripe timeout"));
        }
        return Promise.resolve({
          stripeSubscriptionId: "sub_stripe_2",
          stripeCustomerId: "cus_1",
          status: "past_due" as const,
          billingInterval: "monthly" as const,
          priceCents: 4990,
          stripePriceId: "price_1",
          stripeCouponId: null,
          discountPercent: null,
          trialEndsAt: null,
          currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
          currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
          canceledAt: null,
        });
      }),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findAllStripeLinked: jest.fn().mockResolvedValue([failing, healthy]),
    });

    const useCase = new ReconcileSubscriptionsUseCase(
      subscriptionRepo,
      paymentGateway,
    );
    const result = await useCase.execute();

    expect(result).toEqual({ checked: 2, updated: 1, errors: 1 });
    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-2",
      expect.objectContaining({ status: "past_due" }),
    );
  });
});
