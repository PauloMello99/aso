import {
  SyncPlanCatalogUseCase,
  SyncPlanCatalogReport,
} from "./sync-plan-catalog.use-case";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import { PLAN_CATALOG } from "../../domain/plan-catalog";
import { StripeCatalogSyncFailedException } from "../../domain/exceptions/stripe-catalog-sync-failed.exception";

function buildPlan(overrides: Partial<BillingPlanEntity> = {}): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "standard",
    stripeProductId: "prod_1",
    stripePriceId: "price_1",
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

describe("SyncPlanCatalogUseCase", () => {
  const [entry] = PLAN_CATALOG;
  if (!entry) {
    throw new Error("PLAN_CATALOG must have at least one entry for this spec");
  }

  it("seeds from PLAN_CATALOG when there is no row yet for the key (findByKey returns null)", async () => {
    const paymentGateway = buildFakePaymentGateway({
      findPriceByLookupKey: jest.fn().mockResolvedValue(null),
      ensureProduct: jest.fn().mockResolvedValue({ productId: "prod_1" }),
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(buildPlan()),
    });

    const useCase = new SyncPlanCatalogUseCase(paymentGateway, billingPlanRepo);
    const report = await useCase.execute();

    expect(billingPlanRepo.findByKey).toHaveBeenCalledWith(entry.key);
    expect(paymentGateway.createPrice).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod_1",
        amountCents: entry.priceCents,
      }),
    );
    expect(billingPlanRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: entry.key,
        stripeProductId: "prod_1",
        stripePriceId: "price_new",
        lookupKey: entry.lookupKey,
        productKey: entry.productKey,
      }),
    );
    expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
    expect(report.results).toEqual([
      expect.objectContaining({
        key: entry.key,
        status: "created",
        stripeProductId: "prod_1",
        stripePriceId: "price_new",
      }),
    ]);
  });

  it("does not rotate the price when the billing_plans row amount differs from the static PLAN_CATALOG — reports drift instead", async () => {
    // The row in billing_plans (source of truth) has a price that no longer
    // matches the static seed array — e.g. an admin changed it out of band.
    const row = buildPlan({ amountCents: entry.priceCents + 1000 });
    const paymentGateway = buildFakePaymentGateway({
      findPriceByLookupKey: jest.fn().mockResolvedValue({
        priceId: "price_current",
        productId: "prod_1",
        // Stripe's Price still reflects the *old* local amount, diverging
        // from the row's current amountCents.
        unitAmount: entry.priceCents,
      }),
      ensureProduct: jest.fn().mockResolvedValue({ productId: "prod_1" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(row),
      updateByKey: jest.fn().mockResolvedValue(row),
    });

    const useCase = new SyncPlanCatalogUseCase(paymentGateway, billingPlanRepo);
    const report = await useCase.execute();

    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
    expect(paymentGateway.archivePrice).not.toHaveBeenCalled();
    expect(billingPlanRepo.upsert).not.toHaveBeenCalled();
    expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith(
      row.key,
      expect.objectContaining({
        stripeProductId: "prod_1",
        stripePriceId: "price_current",
      }),
    );
    expect(report.results).toEqual([
      expect.objectContaining({
        key: entry.key,
        status: "drift",
        stripePriceId: "price_current",
      }),
    ]);
  });

  it("creates a Stripe price for an existing row when none exists yet for its lookup key", async () => {
    const row = buildPlan();
    const paymentGateway = buildFakePaymentGateway({
      findPriceByLookupKey: jest.fn().mockResolvedValue(null),
      ensureProduct: jest.fn().mockResolvedValue({ productId: "prod_1" }),
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(row),
      updateByKey: jest.fn().mockResolvedValue(row),
    });

    const useCase = new SyncPlanCatalogUseCase(paymentGateway, billingPlanRepo);
    const report = await useCase.execute();

    expect(paymentGateway.createPrice).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod_1",
        amountCents: row.amountCents,
        lookupKey: row.lookupKey,
      }),
    );
    expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith(
      row.key,
      expect.objectContaining({
        stripeProductId: "prod_1",
        stripePriceId: "price_new",
      }),
    );
    expect(report.results).toEqual([
      expect.objectContaining({ key: entry.key, status: "created" }),
    ]);
  });

  it("reports unchanged when the row's price already matches Stripe", async () => {
    const row = buildPlan();
    const paymentGateway = buildFakePaymentGateway({
      findPriceByLookupKey: jest.fn().mockResolvedValue({
        priceId: "price_current",
        productId: "prod_1",
        unitAmount: row.amountCents,
      }),
      ensureProduct: jest.fn().mockResolvedValue({ productId: "prod_1" }),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(row),
      updateByKey: jest.fn().mockResolvedValue(row),
    });

    const useCase = new SyncPlanCatalogUseCase(paymentGateway, billingPlanRepo);
    const report = await useCase.execute();

    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
    expect(report.results).toEqual([
      expect.objectContaining({
        key: entry.key,
        status: "unchanged",
        stripePriceId: "price_current",
      }),
    ]);
  });

  it("marks the entry as failed and throws StripeCatalogSyncFailedException carrying the per-entry report", async () => {
    const paymentGateway = buildFakePaymentGateway({
      findPriceByLookupKey: jest.fn().mockResolvedValue(null),
      ensureProduct: jest.fn().mockRejectedValue(new Error("Stripe unavailable")),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(null),
    });

    const useCase = new SyncPlanCatalogUseCase(paymentGateway, billingPlanRepo);

    expect.assertions(3);
    try {
      await useCase.execute();
    } catch (error) {
      expect(error).toBeInstanceOf(StripeCatalogSyncFailedException);
      const syncError = error as StripeCatalogSyncFailedException<SyncPlanCatalogReport>;
      expect(syncError.report.results).toEqual([
        expect.objectContaining({
          key: entry.key,
          status: "failed",
          error: "Stripe unavailable",
        }),
      ]);
    }

    expect(billingPlanRepo.upsert).not.toHaveBeenCalled();
  });
});
