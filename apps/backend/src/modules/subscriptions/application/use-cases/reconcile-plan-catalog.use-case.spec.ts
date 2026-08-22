import { ReconcilePlanCatalogUseCase } from "./reconcile-plan-catalog.use-case";
import { ICronJobStateRepository } from "../../../../common/cron/cron-job-state.repository.interface";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
  UpsertBillingPlanData,
} from "../../domain/billing-plan.repository.interface";
import {
  BillingPlanPriceEntity,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";

function buildPlan(
  overrides: Partial<BillingPlanEntity> = {},
): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "pro",
    stripeProductId: "prod_1",
    stripePriceId: null,
    name: "Pro",
    description: "Plano Pro",
    amountCents: 4990,
    currency: "brl",
    interval: "monthly",
    active: true,
    metadata: {},
    lookupKey: null,
    productKey: "pro",
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
    id: "price-1",
    planId: "plan-1",
    interval: "monthly",
    amountCents: 4990,
    currency: "brl",
    stripePriceId: "price_stripe_1",
    lookupKey: "pro-monthly",
    active: true,
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildCronJobStateRepo(
  overrides: Partial<jest.Mocked<ICronJobStateRepository>> = {},
): jest.Mocked<ICronJobStateRepository> {
  return {
    claimRun: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as jest.Mocked<ICronJobStateRepository>;
}

function buildBillingPlanRepo(
  overrides: Partial<jest.Mocked<IBillingPlanRepository>> = {},
): jest.Mocked<IBillingPlanRepository> {
  return {
    findByKey: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
    findByStripeProductId: jest.fn(),
    findByStripePriceId: jest.fn(),
    updateByKey: jest
      .fn()
      .mockImplementation((key: string, data: Partial<UpsertBillingPlanData>) =>
        Promise.resolve(buildPlan({ key, ...data })),
      ),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanRepository>;
}

function buildBillingPlanPriceRepo(
  overrides: Partial<jest.Mocked<IBillingPlanPriceRepository>> = {},
): jest.Mocked<IBillingPlanPriceRepository> {
  return {
    findActiveByPlanId: jest.fn(),
    findAllByPlanId: jest.fn().mockResolvedValue([]),
    findActiveByPlanIdAndInterval: jest.fn(),
    findByPlanIdAndInterval: jest.fn(),
    findByStripePriceId: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deactivateById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanPriceRepository>;
}

function buildPaymentGateway(
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

function buildTelemetry(): jest.Mocked<TelemetryService> {
  return {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    flush: jest.fn(),
    enabled: true,
  } as unknown as jest.Mocked<TelemetryService>;
}

function buildRevalidationClient(): jest.Mocked<FrontendRevalidationClient> {
  return {
    revalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<FrontendRevalidationClient>;
}

describe("ReconcilePlanCatalogUseCase", () => {
  it("skips without touching anything when the throttle claim fails", async () => {
    const cronJobStateRepo = buildCronJobStateRepo({
      claimRun: jest.fn().mockResolvedValue(false),
    });
    const billingPlanRepo = buildBillingPlanRepo();
    const billingPlanPriceRepo = buildBillingPlanPriceRepo();
    const gateway = buildPaymentGateway();
    const telemetry = buildTelemetry();
    const revalidationClient = buildRevalidationClient();

    const useCase = new ReconcilePlanCatalogUseCase(
      cronJobStateRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      gateway,
      telemetry,
      revalidationClient,
    );
    const result = await useCase.execute();

    expect(result).toEqual({ skipped: true, changed: false });
    expect(billingPlanRepo.findAll).not.toHaveBeenCalled();
    expect(revalidationClient.revalidate).not.toHaveBeenCalled();
  });

  it("runs fully once the claim succeeds and reports no diffs when nothing drifted", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const cronJobStateRepo = buildCronJobStateRepo();
    const billingPlanRepo = buildBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildBillingPlanPriceRepo({
      findAllByPlanId: jest.fn().mockResolvedValue([price]),
    });
    const gateway = buildPaymentGateway({
      retrieveProduct: jest.fn().mockResolvedValue({
        productId: "prod_1",
        name: plan.name,
        description: plan.description,
        metadata: {},
        active: true,
      }),
      retrievePrice: jest.fn().mockResolvedValue({
        priceId: "price_stripe_1",
        productId: "prod_1",
        unitAmount: price.amountCents,
        currency: price.currency,
        interval: "monthly",
        lookupKey: "pro-monthly",
        active: true,
      }),
    });
    const telemetry = buildTelemetry();
    const revalidationClient = buildRevalidationClient();

    const useCase = new ReconcilePlanCatalogUseCase(
      cronJobStateRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      gateway,
      telemetry,
      revalidationClient,
    );
    const result = await useCase.execute();

    expect(result).toEqual({ skipped: false, changed: false, results: [] });
    expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
    expect(billingPlanPriceRepo.updateById).not.toHaveBeenCalled();
    expect(revalidationClient.revalidate).not.toHaveBeenCalled();
  });

  it("overwrites a divergent product locally from Stripe", async () => {
    const plan = buildPlan({ name: "Pro (old)", active: true });
    const cronJobStateRepo = buildCronJobStateRepo();
    const billingPlanRepo = buildBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildBillingPlanPriceRepo({
      findAllByPlanId: jest.fn().mockResolvedValue([]),
    });
    const gateway = buildPaymentGateway({
      retrieveProduct: jest.fn().mockResolvedValue({
        productId: "prod_1",
        name: "Pro (Stripe)",
        description: plan.description,
        metadata: {},
        active: true,
      }),
    });
    const telemetry = buildTelemetry();
    const revalidationClient = buildRevalidationClient();

    const useCase = new ReconcilePlanCatalogUseCase(
      cronJobStateRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      gateway,
      telemetry,
      revalidationClient,
    );
    const result = await useCase.execute();

    expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith("pro", {
      name: "Pro (Stripe)",
    });
    expect(result.changed).toBe(true);
    expect(result.results).toEqual([
      {
        planKey: "pro",
        field: "name",
        oldValue: "Pro (old)",
        newValue: "Pro (Stripe)",
      },
    ]);
    expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
  });

  it("overwrites a divergent price amount locally from Stripe and reports telemetry with old/new values", async () => {
    const plan = buildPlan();
    const price = buildPrice({ amountCents: 4990 });
    const cronJobStateRepo = buildCronJobStateRepo();
    const billingPlanRepo = buildBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildBillingPlanPriceRepo({
      findAllByPlanId: jest.fn().mockResolvedValue([price]),
    });
    const gateway = buildPaymentGateway({
      retrieveProduct: jest.fn().mockResolvedValue({
        productId: "prod_1",
        name: plan.name,
        description: plan.description,
        metadata: {},
        active: true,
      }),
      retrievePrice: jest.fn().mockResolvedValue({
        priceId: "price_stripe_1",
        productId: "prod_1",
        unitAmount: 5990,
        currency: price.currency,
        interval: "monthly",
        lookupKey: "pro-monthly",
        active: true,
      }),
    });
    const telemetry = buildTelemetry();
    const revalidationClient = buildRevalidationClient();

    const useCase = new ReconcilePlanCatalogUseCase(
      cronJobStateRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      gateway,
      telemetry,
      revalidationClient,
    );
    const result = await useCase.execute();

    expect(billingPlanPriceRepo.updateById).toHaveBeenCalledWith("price-1", {
      amountCents: 5990,
    });
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("auto-corrected"),
      "warn",
      expect.objectContaining({
        code: "PLAN_CATALOG_PRICE_AMOUNT_CORRECTED",
        oldAmountCents: 4990,
        newAmountCents: 5990,
      }),
    );
    expect(result.changed).toBe(true);
    expect(result.results).toEqual([
      {
        planKey: "pro",
        interval: "monthly",
        field: "amountCents",
        oldValue: "4990",
        newValue: "5990",
      },
    ]);
  });

  it("deactivates a price locally when it no longer exists in Stripe", async () => {
    const plan = buildPlan();
    const price = buildPrice();
    const cronJobStateRepo = buildCronJobStateRepo();
    const billingPlanRepo = buildBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildBillingPlanPriceRepo({
      findAllByPlanId: jest.fn().mockResolvedValue([price]),
    });
    const gateway = buildPaymentGateway({
      retrieveProduct: jest.fn().mockResolvedValue({
        productId: "prod_1",
        name: plan.name,
        description: plan.description,
        metadata: {},
        active: true,
      }),
      retrievePrice: jest.fn().mockResolvedValue(null),
    });
    const telemetry = buildTelemetry();
    const revalidationClient = buildRevalidationClient();

    const useCase = new ReconcilePlanCatalogUseCase(
      cronJobStateRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      gateway,
      telemetry,
      revalidationClient,
    );
    const result = await useCase.execute();

    expect(billingPlanPriceRepo.deactivateById).toHaveBeenCalledWith("price-1");
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("missing"),
      "warn",
      expect.objectContaining({ code: "PLAN_CATALOG_PRICE_MISSING" }),
    );
    expect(result.changed).toBe(true);
  });

  it("deactivates via deactivateById (not a plain patch) when Stripe reports the price as archived, and does not also correct its amount", async () => {
    const plan = buildPlan();
    const price = buildPrice({ amountCents: 4990 });
    const cronJobStateRepo = buildCronJobStateRepo();
    const billingPlanRepo = buildBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildBillingPlanPriceRepo({
      findAllByPlanId: jest.fn().mockResolvedValue([price]),
    });
    const gateway = buildPaymentGateway({
      retrieveProduct: jest.fn().mockResolvedValue({
        productId: "prod_1",
        name: plan.name,
        description: plan.description,
        metadata: {},
        active: true,
      }),
      retrievePrice: jest.fn().mockResolvedValue({
        priceId: "price_stripe_1",
        productId: "prod_1",
        // Archived: also carries a divergent amount, which must NOT be
        // corrected — the row is being retired, not kept alive.
        unitAmount: 5990,
        currency: price.currency,
        interval: "monthly",
        lookupKey: "pro-monthly",
        active: false,
      }),
    });
    const telemetry = buildTelemetry();
    const revalidationClient = buildRevalidationClient();

    const useCase = new ReconcilePlanCatalogUseCase(
      cronJobStateRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      gateway,
      telemetry,
      revalidationClient,
    );
    const result = await useCase.execute();

    expect(billingPlanPriceRepo.deactivateById).toHaveBeenCalledWith("price-1");
    expect(billingPlanPriceRepo.updateById).not.toHaveBeenCalled();
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("archived"),
      "warn",
      expect.objectContaining({ code: "PLAN_CATALOG_PRICE_ARCHIVED" }),
    );
    expect(result.results).toEqual([
      {
        planKey: "pro",
        interval: "monthly",
        field: "active",
        oldValue: "true",
        newValue: "false",
      },
    ]);
    expect(result.changed).toBe(true);
  });

  it("does not deactivate the plan when its Stripe product vanishes, only logs + telemetry", async () => {
    const plan = buildPlan();
    const cronJobStateRepo = buildCronJobStateRepo();
    const billingPlanRepo = buildBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildBillingPlanPriceRepo({
      findAllByPlanId: jest.fn().mockResolvedValue([]),
    });
    const gateway = buildPaymentGateway({
      retrieveProduct: jest.fn().mockResolvedValue(null),
    });
    const telemetry = buildTelemetry();
    const revalidationClient = buildRevalidationClient();

    const useCase = new ReconcilePlanCatalogUseCase(
      cronJobStateRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      gateway,
      telemetry,
      revalidationClient,
    );
    const result = await useCase.execute();

    expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("missing"),
      "warn",
      expect.objectContaining({ code: "PLAN_CATALOG_PRODUCT_MISSING" }),
    );
    expect(result.changed).toBe(false);
    expect(result.results).toEqual([]);
  });

  it("continues reconciling other plans after a failure on one", async () => {
    const failingPlan = buildPlan({
      id: "plan-1",
      key: "pro",
      stripeProductId: "prod_1",
    });
    const healthyPlan = buildPlan({
      id: "plan-2",
      key: "premium",
      name: "Premium (old)",
      stripeProductId: "prod_2",
    });
    const cronJobStateRepo = buildCronJobStateRepo();
    const billingPlanRepo = buildBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([failingPlan, healthyPlan]),
    });
    const billingPlanPriceRepo = buildBillingPlanPriceRepo({
      findAllByPlanId: jest.fn().mockResolvedValue([]),
    });
    const gateway = buildPaymentGateway({
      retrieveProduct: jest.fn().mockImplementation((productId: string) => {
        if (productId === "prod_1") {
          return Promise.reject(new Error("stripe timeout"));
        }
        return Promise.resolve({
          productId: "prod_2",
          name: "Premium (Stripe)",
          description: healthyPlan.description,
          metadata: {},
          active: true,
        });
      }),
    });
    const telemetry = buildTelemetry();
    const revalidationClient = buildRevalidationClient();

    const useCase = new ReconcilePlanCatalogUseCase(
      cronJobStateRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      gateway,
      telemetry,
      revalidationClient,
    );
    const result = await useCase.execute();

    expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith("premium", {
      name: "Premium (Stripe)",
    });
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("reconciliation failed"),
      "warn",
      expect.objectContaining({
        code: "PLAN_CATALOG_RECONCILE_FAILED",
        planKey: "pro",
      }),
    );
    expect(result.changed).toBe(true);
  });
});
