import {
  SyncPlanCatalogUseCase,
  SyncPlanCatalogReport,
} from "./sync-plan-catalog.use-case";
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
import type { PlanCatalogEntry } from "../../domain/plan-catalog";
import { StripeCatalogSyncFailedException } from "../../domain/exceptions/stripe-catalog-sync-failed.exception";

// Fixture catalog with a plan that has two intervals (to cover per-interval
// behavior) and a second plan (to cover "one entry fails, others continue").
// PLAN_CATALOG itself only has one plan/one price today, which is not enough
// to exercise these cases, so we mock the module instead of importing the
// real catalog.
const FIXTURE_CATALOG: PlanCatalogEntry[] = [
  {
    key: "standard",
    productKey: "ink-ops-standard",
    name: "Padrão",
    prices: [
      {
        interval: "monthly",
        priceCents: 40000,
        currency: "brl",
        lookupKey: "ink-ops-standard-monthly",
      },
      {
        interval: "annual",
        priceCents: 400000,
        currency: "brl",
        lookupKey: "ink-ops-standard-annual",
      },
    ],
  },
  {
    key: "pro",
    productKey: "ink-ops-pro",
    name: "Pro",
    prices: [
      {
        interval: "monthly",
        priceCents: 80000,
        currency: "brl",
        lookupKey: "ink-ops-pro-monthly",
      },
    ],
  },
];

jest.mock("../../domain/plan-catalog", () => {
  const actual = jest.requireActual("../../domain/plan-catalog");
  return {
    ...actual,
    get PLAN_CATALOG() {
      return FIXTURE_CATALOG;
    },
  };
});

function buildPlan(overrides: Partial<BillingPlanEntity> = {}): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "standard",
    stripeProductId: "prod_standard",
    stripePriceId: null,
    name: "Padrão",
    description: null,
    amountCents: 40000,
    currency: "brl",
    interval: "monthly",
    active: true,
    metadata: {},
    lookupKey: "ink-ops-standard-monthly",
    productKey: "ink-ops-standard",
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildPriceRow(
  overrides: Partial<BillingPlanPriceEntity> = {},
): BillingPlanPriceEntity {
  return {
    id: "price-row-1",
    planId: "plan-1",
    interval: "monthly",
    amountCents: 40000,
    currency: "brl",
    stripePriceId: "price_1",
    lookupKey: "ink-ops-standard-monthly",
    active: true,
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
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
    // Default resolves undefined (falsy) so every existing "no active row"
    // test path — which never overrides this — keeps going through
    // createOrAdoptPrice exactly as before.
    findByPlanIdAndInterval: jest.fn(),
    findByStripePriceId: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deactivateById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanPriceRepository>;
}

describe("SyncPlanCatalogUseCase", () => {
  const [standardEntry, proEntry] = FIXTURE_CATALOG;
  if (!standardEntry || !proEntry) {
    throw new Error("FIXTURE_CATALOG must have two entries for this spec");
  }

  it("creates the plan row and every price when nothing exists yet", async () => {
    // FIXTURE_CATALOG has two plans; ensureProduct/upsert/createPrice are
    // implemented generically (keyed off the input) so both "standard" and
    // "pro" go through the same seed-from-scratch path in one assertion.
    const paymentGateway = buildFakePaymentGateway({
      ensureProduct: jest.fn((params: { id: string }) =>
        Promise.resolve({ productId: params.id }),
      ),
      findPriceByLookupKey: jest.fn().mockResolvedValue(null),
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_generated" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(null),
      upsert: jest.fn((data: UpsertBillingPlanData) =>
        Promise.resolve(
          buildPlan({
            key: data.key,
            stripeProductId: data.stripeProductId ?? null,
            productKey: data.productKey ?? null,
          }),
        ),
      ),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(buildPriceRow()),
    });

    const useCase = new SyncPlanCatalogUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
    );

    const report = await useCase.execute();

    expect(billingPlanRepo.findByKey).toHaveBeenCalledWith("standard");
    expect(billingPlanRepo.findByKey).toHaveBeenCalledWith("pro");
    expect(billingPlanRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "standard",
        amountCents: standardEntry.prices[0]?.priceCents,
        currency: standardEntry.prices[0]?.currency,
        interval: standardEntry.prices[0]?.interval,
      }),
    );
    expect(billingPlanPriceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        interval: "monthly",
        amountCents: 40000,
        lookupKey: "ink-ops-standard-monthly",
        active: true,
      }),
    );
    expect(billingPlanPriceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        interval: "annual",
        amountCents: 400000,
        lookupKey: "ink-ops-standard-annual",
        active: true,
      }),
    );

    const statuses = report.results.map((r) => `${r.key}:${r.interval}=${r.status}`);
    expect(statuses).toEqual(
      expect.arrayContaining([
        "standard:monthly=created",
        "standard:annual=created",
        "pro:monthly=created",
      ]),
    );
  });

  it("creates only the missing interval when the plan and one price already exist", async () => {
    const plan = buildPlan({ key: "standard", stripeProductId: "prod_standard" });
    const paymentGateway = buildFakePaymentGateway({
      ensureProduct: jest.fn().mockResolvedValue({ productId: "prod_standard" }),
      findPriceByLookupKey: jest.fn().mockResolvedValue(null),
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_annual_new" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn((key: string) =>
        Promise.resolve(key === "standard" ? plan : null),
      ),
      updateByKey: jest.fn().mockResolvedValue(plan),
      upsert: jest
        .fn()
        .mockResolvedValue(buildPlan({ key: "pro", stripeProductId: "prod_pro" })),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn((planId: string, interval: string) =>
        Promise.resolve(
          planId === "plan-1" && interval === "monthly"
            ? buildPriceRow({ interval: "monthly" })
            : null,
        ),
      ),
      create: jest.fn().mockResolvedValue(buildPriceRow({ interval: "annual" })),
    });

    const useCase = new SyncPlanCatalogUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
    );
    const report = await useCase.execute();

    // Only the missing interval (annual) triggers createPrice/create for
    // "standard"; "monthly" already had an active row.
    expect(paymentGateway.createPrice).toHaveBeenCalledWith(
      expect.objectContaining({ interval: "annual", lookupKey: "ink-ops-standard-annual" }),
    );
    // NOTE: this also holds for "pro"'s monthly price, but only because
    // every buildPlan() in this file defaults to id "plan-1" — pro's upsert
    // mock resolves a plan with that same id, so findActiveByPlanIdAndInterval
    // (keyed on planId === "plan-1" && interval === "monthly") returns an
    // existing row for pro too, skipping createPrice for it. If a future
    // edit gives each plan a distinct id, assert on the
    // "ink-ops-standard-monthly" lookupKey specifically instead.
    expect(paymentGateway.createPrice).not.toHaveBeenCalledWith(
      expect.objectContaining({ interval: "monthly" }),
    );

    const standardResults = report.results.filter((r) => r.key === "standard");
    expect(standardResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ interval: "monthly", status: "unchanged" }),
        expect.objectContaining({ interval: "annual", status: "created" }),
      ]),
    );
  });

  it("reports unchanged when the active price row already matches the catalog amount", async () => {
    const plan = buildPlan({ key: "pro", stripeProductId: "prod_pro" });
    const paymentGateway = buildFakePaymentGateway({
      ensureProduct: jest.fn().mockResolvedValue({ productId: "prod_pro" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn((key: string) =>
        Promise.resolve(key === "pro" ? plan : null),
      ),
      updateByKey: jest.fn().mockResolvedValue(plan),
      upsert: jest
        .fn()
        .mockResolvedValue(buildPlan({ key: "standard", stripeProductId: "prod_standard" })),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(
        buildPriceRow({ interval: "monthly", amountCents: 80000 }),
      ),
      create: jest.fn().mockResolvedValue(buildPriceRow()),
    });

    const useCase = new SyncPlanCatalogUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
    );
    const report = await useCase.execute();

    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
    expect(paymentGateway.findPriceByLookupKey).not.toHaveBeenCalledWith(
      "ink-ops-pro-monthly",
    );

    const proResult = report.results.find(
      (r) => r.key === "pro" && r.interval === "monthly",
    );
    expect(proResult).toEqual(
      expect.objectContaining({ status: "unchanged", stripePriceId: "price_1" }),
    );
  });

  it("reports drift and does not create a price when the active row's amount diverges from the catalog", async () => {
    const plan = buildPlan({ key: "pro", stripeProductId: "prod_pro" });
    const paymentGateway = buildFakePaymentGateway({
      ensureProduct: jest.fn().mockResolvedValue({ productId: "prod_pro" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn((key: string) =>
        Promise.resolve(key === "pro" ? plan : null),
      ),
      updateByKey: jest.fn().mockResolvedValue(plan),
      upsert: jest
        .fn()
        .mockResolvedValue(buildPlan({ key: "standard", stripeProductId: "prod_standard" })),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(
        // pro's catalog price is 80000; the local row diverges.
        buildPriceRow({ interval: "monthly", amountCents: 85000 }),
      ),
      create: jest.fn().mockResolvedValue(buildPriceRow()),
    });

    const useCase = new SyncPlanCatalogUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
    );
    const report = await useCase.execute();

    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
    expect(billingPlanPriceRepo.create).not.toHaveBeenCalled();

    const proResult = report.results.find(
      (r) => r.key === "pro" && r.interval === "monthly",
    );
    expect(proResult).toEqual(
      expect.objectContaining({ status: "drift", stripePriceId: "price_1" }),
    );
  });

  it("does not abort other entries when one entry fails, and throws at the end with the full report", async () => {
    const proPlan = buildPlan({
      key: "pro",
      stripeProductId: "prod_pro",
      productKey: "ink-ops-pro",
    });
    const paymentGateway = buildFakePaymentGateway({
      ensureProduct: jest.fn((params: { id: string }) => {
        if (params.id === "ink-ops-standard") {
          return Promise.reject(new Error("Stripe unavailable"));
        }
        return Promise.resolve({ productId: params.id });
      }),
      findPriceByLookupKey: jest.fn().mockResolvedValue(null),
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_pro_monthly" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn((key: string) =>
        Promise.resolve(key === "pro" ? proPlan : null),
      ),
      updateByKey: jest.fn().mockResolvedValue(proPlan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(buildPriceRow()),
    });

    const useCase = new SyncPlanCatalogUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
    );

    expect.assertions(4);
    try {
      await useCase.execute();
    } catch (error) {
      expect(error).toBeInstanceOf(StripeCatalogSyncFailedException);
      const syncError = error as StripeCatalogSyncFailedException<SyncPlanCatalogReport>;
      // "standard" has two prices in the fixture catalog: both must be
      // reported as failed, one row per (key, interval).
      const standardResults = syncError.report.results.filter(
        (r) => r.key === "standard",
      );
      expect(standardResults).toEqual([
        expect.objectContaining({
          interval: "monthly",
          status: "failed",
          error: "Stripe unavailable",
        }),
        expect.objectContaining({
          interval: "annual",
          status: "failed",
          error: "Stripe unavailable",
        }),
      ]);
      const proResult = syncError.report.results.find((r) => r.key === "pro");
      expect(proResult).toEqual(
        expect.objectContaining({ interval: "monthly", status: "created" }),
      );
    }

    expect(billingPlanRepo.upsert).not.toHaveBeenCalled();
  });

  it("does not try to create/adopt a price for an interval that has an existing but INACTIVE row (deliberately disabled by an admin)", async () => {
    const plan = buildPlan({ key: "pro", stripeProductId: "prod_pro" });
    const paymentGateway = buildFakePaymentGateway({
      ensureProduct: jest.fn().mockResolvedValue({ productId: "prod_pro" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn((key: string) =>
        Promise.resolve(key === "pro" ? plan : null),
      ),
      updateByKey: jest.fn().mockResolvedValue(plan),
      upsert: jest
        .fn()
        .mockResolvedValue(buildPlan({ key: "standard", stripeProductId: "prod_standard" })),
    });
    const inactiveRow = buildPriceRow({
      interval: "monthly",
      active: false,
      stripePriceId: "price_pro_monthly_disabled",
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      // No ACTIVE row for (pro, monthly) — SetPlanIntervalActiveUseCase
      // disabled it, which preserves stripePriceId/lookupKey and just flips
      // active to false.
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
      findByPlanIdAndInterval: jest.fn().mockResolvedValue(inactiveRow),
      create: jest.fn().mockResolvedValue(buildPriceRow()),
    });

    const useCase = new SyncPlanCatalogUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
    );
    const report = await useCase.execute();

    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
    expect(paymentGateway.findPriceByLookupKey).not.toHaveBeenCalled();
    expect(billingPlanPriceRepo.create).not.toHaveBeenCalled();

    const proResult = report.results.find(
      (r) => r.key === "pro" && r.interval === "monthly",
    );
    expect(proResult).toEqual(
      expect.objectContaining({
        status: "unchanged",
        stripePriceId: "price_pro_monthly_disabled",
      }),
    );
  });
});
