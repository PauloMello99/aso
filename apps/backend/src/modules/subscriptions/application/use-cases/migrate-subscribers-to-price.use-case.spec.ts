import { MigrateSubscribersToPriceUseCase } from "./migrate-subscribers-to-price.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import {
  NormalizedSubscription,
  SubscriptionEntity,
} from "../../domain/subscription.entity";
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
    stripePriceId: "price_old",
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
    cancelAtPeriodEnd: false,
    trialConsumed: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildNormalizedSubscription(
  overrides: Partial<NormalizedSubscription> = {},
): NormalizedSubscription {
  return {
    stripeSubscriptionId: "sub_stripe_1",
    stripeCustomerId: "cus_1",
    status: "active",
    billingInterval: "monthly",
    priceCents: 6990,
    stripePriceId: "price_new",
    stripeCouponId: null,
    discountPercent: null,
    trialEndsAt: null,
    currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
    canceledAt: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function buildFakeSubscriptionRepo(
  overrides: Partial<jest.Mocked<ISubscriptionRepository>> = {},
): jest.Mocked<ISubscriptionRepository> {
  return {
    findByOrgId: jest.fn(),
    findByStripeCustomerId: jest.fn(),
    findByStripeSubscriptionId: jest.fn(),
    findAllStripeLinked: jest.fn(),
    findExpiredComps: jest.fn(),
    findExpiredPastDue: jest.fn(),
    findMigratableByStripePriceId: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISubscriptionRepository>;
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

function buildFakeTelemetry(): jest.Mocked<TelemetryService> {
  return {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  } as unknown as jest.Mocked<TelemetryService>;
}

describe("MigrateSubscribersToPriceUseCase", () => {
  it("returns an empty report when there are no migratable subscribers", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findMigratableByStripePriceId: jest.fn().mockResolvedValue([]),
    });
    const paymentGateway = buildFakePaymentGateway();
    const telemetry = buildFakeTelemetry();

    const useCase = new MigrateSubscribersToPriceUseCase(
      subscriptionRepo,
      paymentGateway,
      telemetry,
    );

    const report = await useCase.execute({
      oldPriceId: "price_old",
      newPriceId: "price_new",
    });

    expect(report).toEqual({ results: [] });
    expect(paymentGateway.updateSubscriptionPrice).not.toHaveBeenCalled();
    expect(telemetry.captureMessage).not.toHaveBeenCalled();
  });

  it("migrates every eligible subscriber and persists the normalized result", async () => {
    const subs = [
      buildSubscription({ id: "sub-1", orgId: "org-1", stripeSubscriptionId: "sub_stripe_1" }),
      buildSubscription({ id: "sub-2", orgId: "org-2", stripeSubscriptionId: "sub_stripe_2" }),
      buildSubscription({ id: "sub-3", orgId: "org-3", stripeSubscriptionId: "sub_stripe_3" }),
    ];
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findMigratableByStripePriceId: jest.fn().mockResolvedValue(subs),
      update: jest.fn().mockResolvedValue(buildSubscription()),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionPrice: jest
        .fn()
        .mockImplementation((stripeSubscriptionId: string) =>
          Promise.resolve(
            buildNormalizedSubscription({ stripeSubscriptionId }),
          ),
        ),
    });
    const telemetry = buildFakeTelemetry();

    const useCase = new MigrateSubscribersToPriceUseCase(
      subscriptionRepo,
      paymentGateway,
      telemetry,
    );

    const report = await useCase.execute({
      oldPriceId: "price_old",
      newPriceId: "price_new",
    });

    expect(report.results).toEqual([
      { orgId: "org-1", stripeSubscriptionId: "sub_stripe_1", status: "migrated" },
      { orgId: "org-2", stripeSubscriptionId: "sub_stripe_2", status: "migrated" },
      { orgId: "org-3", stripeSubscriptionId: "sub_stripe_3", status: "migrated" },
    ]);
    expect(paymentGateway.updateSubscriptionPrice).toHaveBeenCalledTimes(3);
    expect(paymentGateway.updateSubscriptionPrice).toHaveBeenCalledWith(
      "sub_stripe_1",
      "price_new",
      {
        prorationBehavior: "create_prorations",
        idempotencyKey: "sub_stripe_1:price_new",
      },
    );
    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ stripePriceId: "price_new" }),
    );
    expect(telemetry.captureMessage).not.toHaveBeenCalled();
  });

  it("keeps processing the remaining subscribers when one migration fails, and reports the partial failure via telemetry", async () => {
    const subs = [
      buildSubscription({ id: "sub-1", orgId: "org-1", stripeSubscriptionId: "sub_stripe_1" }),
      buildSubscription({ id: "sub-2", orgId: "org-2", stripeSubscriptionId: "sub_stripe_2" }),
      buildSubscription({ id: "sub-3", orgId: "org-3", stripeSubscriptionId: "sub_stripe_3" }),
    ];
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findMigratableByStripePriceId: jest.fn().mockResolvedValue(subs),
      update: jest.fn().mockResolvedValue(buildSubscription()),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionPrice: jest
        .fn()
        .mockImplementation((stripeSubscriptionId: string) => {
          if (stripeSubscriptionId === "sub_stripe_2") {
            return Promise.reject(new Error("stripe rate limited"));
          }
          return Promise.resolve(
            buildNormalizedSubscription({ stripeSubscriptionId }),
          );
        }),
    });
    const telemetry = buildFakeTelemetry();

    const useCase = new MigrateSubscribersToPriceUseCase(
      subscriptionRepo,
      paymentGateway,
      telemetry,
    );

    const report = await useCase.execute({
      oldPriceId: "price_old",
      newPriceId: "price_new",
    });

    expect(report.results).toEqual([
      { orgId: "org-1", stripeSubscriptionId: "sub_stripe_1", status: "migrated" },
      {
        orgId: "org-2",
        stripeSubscriptionId: "sub_stripe_2",
        status: "failed",
        error: "stripe rate limited",
      },
      { orgId: "org-3", stripeSubscriptionId: "sub_stripe_3", status: "migrated" },
    ]);
    expect(paymentGateway.updateSubscriptionPrice).toHaveBeenCalledTimes(3);
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("price_old"),
      "error",
      expect.objectContaining({
        code: "BILLING_SUBSCRIBER_MIGRATION_PARTIAL_FAILURE",
        failedOrgIds: ["org-2"],
      }),
    );
  });

  it("reports 'failed' — without throwing — when the Stripe update succeeds but the local persistence fails, keeping the other subscribers going", async () => {
    // This is the exact case the deterministic idempotencyKey protects: the
    // Stripe call already succeeded, but the local write failed, so a retry
    // will call the gateway again for this subscription (local stripePriceId
    // is still the old one) — reusing the same idempotencyKey as before
    // prevents a duplicate proration on Stripe's side.
    const subs = [
      buildSubscription({ id: "sub-1", orgId: "org-1", stripeSubscriptionId: "sub_stripe_1" }),
      buildSubscription({ id: "sub-2", orgId: "org-2", stripeSubscriptionId: "sub_stripe_2" }),
    ];
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findMigratableByStripePriceId: jest.fn().mockResolvedValue(subs),
      update: jest.fn().mockImplementation((orgId: string) => {
        if (orgId === "org-1") return Promise.reject(new Error("db unavailable"));
        return Promise.resolve(buildSubscription());
      }),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionPrice: jest
        .fn()
        .mockImplementation((stripeSubscriptionId: string) =>
          Promise.resolve(
            buildNormalizedSubscription({ stripeSubscriptionId }),
          ),
        ),
    });
    const telemetry = buildFakeTelemetry();

    const useCase = new MigrateSubscribersToPriceUseCase(
      subscriptionRepo,
      paymentGateway,
      telemetry,
    );

    const report = await useCase.execute({
      oldPriceId: "price_old",
      newPriceId: "price_new",
    });

    expect(report.results).toEqual([
      {
        orgId: "org-1",
        stripeSubscriptionId: "sub_stripe_1",
        status: "failed",
        error: "db unavailable",
      },
      { orgId: "org-2", stripeSubscriptionId: "sub_stripe_2", status: "migrated" },
    ]);
    expect(paymentGateway.updateSubscriptionPrice).toHaveBeenCalledTimes(2);
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      "error",
      expect.objectContaining({ failedOrgIds: ["org-1"] }),
    );
  });

  it("skips a subscriber already on the new price without calling the gateway (idempotent re-run)", async () => {
    const alreadyMigrated = buildSubscription({
      id: "sub-1",
      orgId: "org-1",
      stripeSubscriptionId: "sub_stripe_1",
      stripePriceId: "price_new",
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findMigratableByStripePriceId: jest.fn().mockResolvedValue([alreadyMigrated]),
    });
    const paymentGateway = buildFakePaymentGateway();
    const telemetry = buildFakeTelemetry();

    const useCase = new MigrateSubscribersToPriceUseCase(
      subscriptionRepo,
      paymentGateway,
      telemetry,
    );

    const report = await useCase.execute({
      oldPriceId: "price_old",
      newPriceId: "price_new",
    });

    expect(report.results).toEqual([
      {
        orgId: "org-1",
        stripeSubscriptionId: "sub_stripe_1",
        status: "skipped_already_migrated",
      },
    ]);
    expect(paymentGateway.updateSubscriptionPrice).not.toHaveBeenCalled();
    expect(subscriptionRepo.update).not.toHaveBeenCalled();
  });

  it("does not re-implement the repository's type/status filtering — trusts whatever findMigratableByStripePriceId returns", async () => {
    // findMigratableByStripePriceId is documented to already exclude
    // type='custom' and non active/trialing statuses; the use-case has no
    // filtering logic of its own, it just processes every row returned.
    const eligibleOnly = [
      buildSubscription({ id: "sub-1", orgId: "org-1", type: "standard", status: "trialing" }),
    ];
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findMigratableByStripePriceId: jest.fn().mockResolvedValue(eligibleOnly),
      update: jest.fn().mockResolvedValue(buildSubscription()),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionPrice: jest
        .fn()
        .mockResolvedValue(buildNormalizedSubscription()),
    });
    const telemetry = buildFakeTelemetry();

    const useCase = new MigrateSubscribersToPriceUseCase(
      subscriptionRepo,
      paymentGateway,
      telemetry,
    );

    const report = await useCase.execute({
      oldPriceId: "price_old",
      newPriceId: "price_new",
    });

    expect(subscriptionRepo.findMigratableByStripePriceId).toHaveBeenCalledWith(
      "price_old",
    );
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.status).toBe("migrated");
  });

  it("preserves the discount returned by the gateway when persisting the migration", async () => {
    const sub = buildSubscription({
      id: "sub-1",
      orgId: "org-1",
      stripeSubscriptionId: "sub_stripe_1",
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findMigratableByStripePriceId: jest.fn().mockResolvedValue([sub]),
      update: jest.fn().mockResolvedValue(buildSubscription()),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionPrice: jest.fn().mockResolvedValue(
        buildNormalizedSubscription({
          stripeCouponId: "coupon_1",
          discountPercent: 20,
        }),
      ),
    });
    const telemetry = buildFakeTelemetry();

    const useCase = new MigrateSubscribersToPriceUseCase(
      subscriptionRepo,
      paymentGateway,
      telemetry,
    );

    const report = await useCase.execute({
      oldPriceId: "price_old",
      newPriceId: "price_new",
    });

    expect(report.results).toEqual([
      {
        orgId: "org-1",
        stripeSubscriptionId: "sub_stripe_1",
        status: "migrated",
      },
    ]);
    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        stripeCouponId: "coupon_1",
        discountPercent: 20,
      }),
    );
    expect(telemetry.captureMessage).not.toHaveBeenCalled();
  });
});
