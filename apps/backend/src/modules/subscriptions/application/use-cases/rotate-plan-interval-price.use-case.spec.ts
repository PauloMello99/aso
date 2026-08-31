import { RotatePlanIntervalPriceUseCase } from "./rotate-plan-interval-price.use-case";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  BillingPlanPriceEntity,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { AuditService } from "../../../audit/audit.service";
import { BillingPlanNotFoundException } from "../../domain/exceptions/billing-plan-not-found.exception";
import { InvalidBillingPlanUpdateException } from "../../domain/exceptions/invalid-billing-plan-update.exception";
import { PlanIntervalNotEnabledException } from "../../domain/exceptions/plan-interval-not-enabled.exception";
import { MigrateSubscribersToPriceUseCase } from "./migrate-subscribers-to-price.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";
import { PlanPriceLinkageService } from "../plan-price-linkage.service";

function buildPlan(
  overrides: Partial<BillingPlanEntity> = {},
): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "standard",
    stripeProductId: "prod_1",
    stripePriceId: "price_old",
    name: "Standard",
    description: "Plano padrão",
    amountCents: 4990,
    currency: "brl",
    interval: "monthly",
    active: true,
    metadata: {},
    lookupKey: "standard",
    productKey: "standard",
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    highlighted: false,
    features: [],
    ...overrides,
  };
}

function buildPrice(
  overrides: Partial<BillingPlanPriceEntity> = {},
): BillingPlanPriceEntity {
  return {
    id: "price-row-1",
    planId: "plan-1",
    interval: "monthly",
    amountCents: 4990,
    currency: "brl",
    stripePriceId: "price_old",
    lookupKey: "standard-monthly",
    active: true,
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildFakeBillingPlanRepo(
  overrides: Partial<jest.Mocked<IBillingPlanRepository>> = {},
): jest.Mocked<IBillingPlanRepository> {
  return {
    findByKey: jest.fn(),
    findAll: jest.fn(),
    upsert: jest.fn(),
    findByStripeProductId: jest.fn(),
    findByStripePriceId: jest.fn(),
    updateByKey: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanRepository>;
}

function buildFakeBillingPlanPriceRepo(
  overrides: Partial<jest.Mocked<IBillingPlanPriceRepository>> = {},
): jest.Mocked<IBillingPlanPriceRepository> {
  return {
    findActiveByPlanId: jest.fn(),
    findAllByPlanId: jest.fn(),
    findActiveByPlanIdAndInterval: jest.fn(),
    findByPlanIdAndInterval: jest.fn(),
    findByStripePriceId: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deactivateById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanPriceRepository>;
}

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

function buildFakeTelemetry(): jest.Mocked<TelemetryService> {
  return {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  } as unknown as jest.Mocked<TelemetryService>;
}

function buildFakeRevalidationClient(): jest.Mocked<FrontendRevalidationClient> {
  return {
    revalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<FrontendRevalidationClient>;
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

function buildFakeAuditService(): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
}

function buildFakeMigrateSubscribers(
  overrides: Partial<jest.Mocked<MigrateSubscribersToPriceUseCase>> = {},
): jest.Mocked<MigrateSubscribersToPriceUseCase> {
  return {
    execute: jest.fn().mockResolvedValue({ results: [] }),
    ...overrides,
  } as unknown as jest.Mocked<MigrateSubscribersToPriceUseCase>;
}

// Default resolves matching the default buildPlan()/buildPrice() fixtures
// (stripeProductId: "prod_1", lookupKey: "standard-monthly") so existing
// tests that don't care about linkage resolution keep passing unchanged.
function buildFakePlanPriceLinkage(
  overrides: Partial<jest.Mocked<PlanPriceLinkageService>> = {},
): jest.Mocked<PlanPriceLinkageService> {
  return {
    resolve: jest.fn().mockResolvedValue({
      stripeProductId: "prod_1",
      lookupKey: "standard-monthly",
    }),
    ...overrides,
  } as unknown as jest.Mocked<PlanPriceLinkageService>;
}

describe("RotatePlanIntervalPriceUseCase", () => {
  it("throws InvalidBillingPlanUpdateException when amountCents is not a positive integer and never calls the repo/gateway", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo();
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      buildFakePlanPriceLinkage(),
    );

    for (const amountCents of [0, -100, 10.5]) {
      await expect(
        useCase.execute("standard", "monthly", { amountCents }, "auth-1"),
      ).rejects.toThrow(InvalidBillingPlanUpdateException);
    }
    expect(billingPlanRepo.findByKey).not.toHaveBeenCalled();
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("throws BillingPlanNotFoundException when the plan doesn't exist", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(null),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      buildFakePlanPriceLinkage(),
    );

    await expect(
      useCase.execute(
        "missing-plan",
        "monthly",
        { amountCents: 5990 },
        "auth-1",
      ),
    ).rejects.toThrow(BillingPlanNotFoundException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("throws PlanIntervalNotEnabledException when there is no active price for the (plan, interval) pair", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
    });
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      buildFakePlanPriceLinkage(),
    );

    await expect(
      useCase.execute("standard", "annual", { amountCents: 5990 }, "auth-1"),
    ).rejects.toThrow(PlanIntervalNotEnabledException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("is a no-op when amountCents equals the current price value (and currency unchanged) — gateway is never called", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
    });
    const paymentGateway = buildFakePaymentGateway();
    const auditService = buildFakeAuditService();
    const migrateSubscribers = buildFakeMigrateSubscribers();
    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      auditService,
      migrateSubscribers,
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      buildFakePlanPriceLinkage(),
    );

    const result = await useCase.execute(
      "standard",
      "monthly",
      { amountCents: price.amountCents },
      "auth-1",
    );

    expect(result).toEqual({ price, migration: { results: [] } });
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
    expect(billingPlanPriceRepo.deactivateById).not.toHaveBeenCalled();
    expect(billingPlanPriceRepo.create).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
    expect(migrateSubscribers.execute).not.toHaveBeenCalled();
  });

  it("rotates the price: creates the new Stripe price, deactivates the old row, creates the new row, then archives the old Stripe price — in that order", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const callOrder: string[] = [];
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      deactivateById: jest.fn().mockImplementation(async () => {
        callOrder.push("deactivateById");
      }),
      create: jest.fn().mockImplementation(async (data) => {
        callOrder.push("create");
        return buildPrice({
          id: "price-row-2",
          stripePriceId: data.stripePriceId,
          amountCents: data.amountCents,
          currency: data.currency,
        });
      }),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockImplementation(async () => {
        callOrder.push("createPrice");
        return { priceId: "price_new" };
      }),
      archivePrice: jest.fn().mockImplementation(async () => {
        callOrder.push("archivePrice");
      }),
    });
    const auditService = buildFakeAuditService();
    const migrationReport = {
      results: [
        {
          orgId: "org-1",
          stripeSubscriptionId: "sub_1",
          status: "migrated" as const,
        },
      ],
    };
    const migrateSubscribers = buildFakeMigrateSubscribers({
      execute: jest.fn().mockResolvedValue(migrationReport),
    });

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      auditService,
      migrateSubscribers,
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      buildFakePlanPriceLinkage(),
    );

    const { price: newPrice, migration } = await useCase.execute(
      "standard",
      "monthly",
      { amountCents: 6990 },
      "auth-1",
    );

    expect(paymentGateway.createPrice).toHaveBeenCalledWith({
      productId: "prod_1",
      amountCents: 6990,
      currency: "brl",
      interval: "monthly",
      lookupKey: "standard-monthly",
      transferLookupKey: true,
    });
    expect(billingPlanPriceRepo.deactivateById).toHaveBeenCalledWith(
      "price-row-1",
    );
    expect(billingPlanPriceRepo.create).toHaveBeenCalledWith({
      planId: "plan-1",
      interval: "monthly",
      amountCents: 6990,
      currency: "brl",
      stripePriceId: "price_new",
      lookupKey: "standard-monthly",
      active: true,
    });
    expect(paymentGateway.archivePrice).toHaveBeenCalledWith("price_old");
    expect(callOrder).toEqual([
      "createPrice",
      "deactivateById",
      "create",
      "archivePrice",
    ]);

    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        action: "subscription_changed",
        entityType: "billing_plan_price",
        entityId: newPrice.id,
        metadata: expect.objectContaining({
          operation: "rotate_price",
          planKey: "standard",
          interval: "monthly",
          oldPriceId: "price_old",
          newPriceId: "price_new",
          oldAmountCents: 4990,
          newAmountCents: 6990,
        }),
      }),
    );

    expect(migrateSubscribers.execute).toHaveBeenCalledWith({
      oldPriceId: "price_old",
      newPriceId: "price_new",
    });
    expect(migration).toEqual(migrationReport);
  });

  it("does not undo the local rotation nor propagate the error when archiving the old Stripe price fails", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      create: jest.fn().mockResolvedValue(
        buildPrice({
          id: "price-row-2",
          stripePriceId: "price_new",
          amountCents: 6990,
        }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
      archivePrice: jest.fn().mockRejectedValue(new Error("stripe down")),
    });
    const auditService = buildFakeAuditService();
    const migrateSubscribers = buildFakeMigrateSubscribers();

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      auditService,
      migrateSubscribers,
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      buildFakePlanPriceLinkage(),
    );

    const { price: newPrice } = await useCase.execute(
      "standard",
      "monthly",
      { amountCents: 6990 },
      "auth-1",
    );

    expect(newPrice.stripePriceId).toBe("price_new");
    expect(billingPlanPriceRepo.deactivateById).toHaveBeenCalledTimes(1);
    expect(billingPlanPriceRepo.create).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).toHaveBeenCalled();
    expect(migrateSubscribers.execute).toHaveBeenCalledWith({
      oldPriceId: "price_old",
      newPriceId: "price_new",
    });
  });

  it("reactivates the old price row (compensation) and re-throws the original error when 'create' fails after 'deactivateById' already succeeded", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const createError = new Error("db unavailable");
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      deactivateById: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockRejectedValue(createError),
      updateById: jest.fn().mockResolvedValue({ ...price, active: true }),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
    });
    const auditService = buildFakeAuditService();
    const migrateSubscribers = buildFakeMigrateSubscribers();
    const telemetry = buildFakeTelemetry();
    const revalidationClient = buildFakeRevalidationClient();

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      auditService,
      migrateSubscribers,
      buildFakeSubscriptionRepo(),
      telemetry,
      revalidationClient,
      buildFakePlanPriceLinkage(),
    );

    await expect(
      useCase.execute("standard", "monthly", { amountCents: 6990 }, "auth-1"),
    ).rejects.toThrow(createError);

    expect(billingPlanPriceRepo.deactivateById).toHaveBeenCalledWith(
      "price-row-1",
    );
    expect(billingPlanPriceRepo.updateById).toHaveBeenCalledWith(
      "price-row-1",
      { active: true, lookupKey: "standard-monthly" },
    );
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
    expect(migrateSubscribers.execute).not.toHaveBeenCalled();
    expect(revalidationClient.revalidate).not.toHaveBeenCalled();
  });

  it("logs a critical error and telemetry, then still re-throws the original 'create' error, when the compensation itself also fails", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const createError = new Error("db unavailable");
    const compensationError = new Error("db still unavailable");
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      deactivateById: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockRejectedValue(createError),
      updateById: jest.fn().mockRejectedValue(compensationError),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
    });
    const telemetry = buildFakeTelemetry();

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      buildFakeSubscriptionRepo(),
      telemetry,
      buildFakeRevalidationClient(),
      buildFakePlanPriceLinkage(),
    );

    await expect(
      useCase.execute("standard", "monthly", { amountCents: 6990 }, "auth-1"),
    ).rejects.toThrow(createError);

    expect(telemetry.captureException).toHaveBeenCalledWith(
      compensationError,
      expect.objectContaining({
        code: "BILLING_PRICE_ROTATION_COMPENSATION_FAILED",
        planKey: "standard",
        interval: "monthly",
      }),
    );
  });

  it("rejects a currency change when there are migratable subscribers on the current Stripe price — never calls the gateway", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
    });
    const paymentGateway = buildFakePaymentGateway();
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findMigratableByStripePriceId: jest
        .fn()
        .mockResolvedValue([buildSubscription()]),
    });

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      subscriptionRepo,
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      buildFakePlanPriceLinkage(),
    );

    await expect(
      useCase.execute(
        "standard",
        "monthly",
        { amountCents: 6990, currency: "usd" },
        "auth-1",
      ),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);

    expect(subscriptionRepo.findMigratableByStripePriceId).toHaveBeenCalledWith(
      "price_old",
    );
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
    expect(billingPlanPriceRepo.deactivateById).not.toHaveBeenCalled();
  });

  it("allows a currency change when there are no migratable subscribers on the current Stripe price", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      deactivateById: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(
        buildPrice({
          id: "price-row-2",
          stripePriceId: "price_new",
          amountCents: 6990,
          currency: "usd",
        }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findMigratableByStripePriceId: jest.fn().mockResolvedValue([]),
    });

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      subscriptionRepo,
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      buildFakePlanPriceLinkage(),
    );

    const { price: newPrice } = await useCase.execute(
      "standard",
      "monthly",
      { amountCents: 6990, currency: "usd" },
      "auth-1",
    );

    expect(newPrice.currency).toBe("usd");
    expect(paymentGateway.createPrice).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "usd" }),
    );
  });

  it("triggers frontend cache revalidation after a successful rotation", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      deactivateById: jest.fn().mockResolvedValue(undefined),
      create: jest
        .fn()
        .mockResolvedValue(
          buildPrice({ id: "price-row-2", stripePriceId: "price_new" }),
        ),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
    });
    const revalidationClient = buildFakeRevalidationClient();

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      revalidationClient,
      buildFakePlanPriceLinkage(),
    );

    await useCase.execute(
      "standard",
      "monthly",
      { amountCents: 6990 },
      "auth-1",
    );

    expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
  });

  it("self-heals via PlanPriceLinkageService when the local lookupKey is null: rotation completes and gateway.createPrice receives the derived lookupKey", async () => {
    const plan = buildPlan();
    const price = buildPrice({ lookupKey: null });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      deactivateById: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(
        buildPrice({
          id: "price-row-2",
          stripePriceId: "price_new",
          amountCents: 6990,
          lookupKey: "standard-monthly",
        }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
    });
    const planPriceLinkage = buildFakePlanPriceLinkage({
      resolve: jest.fn().mockResolvedValue({
        stripeProductId: "prod_1",
        lookupKey: "standard-monthly",
      }),
    });

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      planPriceLinkage,
    );

    const { price: newPrice } = await useCase.execute(
      "standard",
      "monthly",
      { amountCents: 6990 },
      "auth-1",
    );

    expect(planPriceLinkage.resolve).toHaveBeenCalledWith(plan, price);
    expect(paymentGateway.createPrice).toHaveBeenCalledWith(
      expect.objectContaining({ lookupKey: "standard-monthly" }),
    );
    expect(newPrice.lookupKey).toBe("standard-monthly");
  });

  it("uses the lookupKey resolved from Stripe when the local row has stripePriceId but no lookupKey", async () => {
    const plan = buildPlan();
    const price = buildPrice({ lookupKey: null });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      deactivateById: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(
        buildPrice({
          id: "price-row-2",
          stripePriceId: "price_new",
          amountCents: 6990,
          lookupKey: "resolved-from-stripe",
        }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
    });
    const planPriceLinkage = buildFakePlanPriceLinkage({
      resolve: jest.fn().mockResolvedValue({
        stripeProductId: "prod_1",
        lookupKey: "resolved-from-stripe",
      }),
    });

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      planPriceLinkage,
    );

    await useCase.execute(
      "standard",
      "monthly",
      { amountCents: 6990 },
      "auth-1",
    );

    expect(paymentGateway.createPrice).toHaveBeenCalledWith(
      expect.objectContaining({ lookupKey: "resolved-from-stripe" }),
    );
  });

  it("throws InvalidBillingPlanUpdateException and never calls gateway.createPrice when PlanPriceLinkageService cannot resolve the linkage", async () => {
    const plan = buildPlan({ stripeProductId: null, productKey: null });
    const price = buildPrice({ lookupKey: null, stripePriceId: null });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
    });
    const paymentGateway = buildFakePaymentGateway();
    const planPriceLinkage = buildFakePlanPriceLinkage({
      resolve: jest.fn().mockResolvedValue(null),
    });

    const useCase = new RotatePlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeMigrateSubscribers(),
      buildFakeSubscriptionRepo(),
      buildFakeTelemetry(),
      buildFakeRevalidationClient(),
      planPriceLinkage,
    );

    await expect(
      useCase.execute("standard", "monthly", { amountCents: 6990 }, "auth-1"),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });
});
