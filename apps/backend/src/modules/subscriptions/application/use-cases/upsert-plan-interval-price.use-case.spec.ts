import { UpsertPlanIntervalPriceUseCase } from "./upsert-plan-interval-price.use-case";
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
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";

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
    interval: "annual",
    amountCents: 49900,
    currency: "brl",
    stripePriceId: "price_annual",
    lookupKey: "standard-annual",
    active: true,
    lastSyncedAt: null,
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

function buildFakeRevalidationClient(): jest.Mocked<FrontendRevalidationClient> {
  return {
    revalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<FrontendRevalidationClient>;
}

describe("UpsertPlanIntervalPriceUseCase", () => {
  it("throws InvalidBillingPlanUpdateException when amountCents is not a positive integer and never touches the repos/gateway", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo();
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new UpsertPlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeRevalidationClient(),
    );

    for (const amountCents of [0, -100, 10.5]) {
      await expect(
        useCase.execute(
          "standard",
          "annual",
          { amountCents, currency: "brl" },
          "auth-1",
        ),
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
    const useCase = new UpsertPlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeRevalidationClient(),
    );

    await expect(
      useCase.execute(
        "missing-plan",
        "annual",
        { amountCents: 49900, currency: "brl" },
        "auth-1",
      ),
    ).rejects.toThrow(BillingPlanNotFoundException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("throws InvalidBillingPlanUpdateException when the plan has no Stripe product", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest
        .fn()
        .mockResolvedValue(buildPlan({ stripeProductId: null })),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new UpsertPlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeRevalidationClient(),
    );

    await expect(
      useCase.execute(
        "standard",
        "annual",
        { amountCents: 49900, currency: "brl" },
        "auth-1",
      ),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("throws InvalidBillingPlanUpdateException when the plan has no productKey (lookup_key would be malformed)", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan({ productKey: null })),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new UpsertPlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeRevalidationClient(),
    );

    await expect(
      useCase.execute(
        "standard",
        "annual",
        { amountCents: 49900, currency: "brl" },
        "auth-1",
      ),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("throws InvalidBillingPlanUpdateException when the interval already has an active price (should rotate instead)", async () => {
    const plan = buildPlan();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(buildPrice()),
    });
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new UpsertPlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeRevalidationClient(),
    );

    await expect(
      useCase.execute(
        "standard",
        "annual",
        { amountCents: 49900, currency: "brl" },
        "auth-1",
      ),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
    expect(billingPlanPriceRepo.create).not.toHaveBeenCalled();
  });

  it("creates the Stripe price and the local row, then logs the audit trail", async () => {
    const plan = buildPlan();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const newPrice = buildPrice({ id: "price-row-2" });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(newPrice),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_annual" }),
    });
    const auditService = buildFakeAuditService();
    const revalidationClient = buildFakeRevalidationClient();

    const useCase = new UpsertPlanIntervalPriceUseCase(
      paymentGateway,
      billingPlanRepo,
      billingPlanPriceRepo,
      auditService,
      revalidationClient,
    );

    const result = await useCase.execute(
      "standard",
      "annual",
      { amountCents: 49900, currency: "brl" },
      "auth-1",
    );

    expect(paymentGateway.createPrice).toHaveBeenCalledWith({
      productId: "prod_1",
      amountCents: 49900,
      currency: "brl",
      interval: "annual",
      lookupKey: "standard-annual",
    });
    expect(billingPlanPriceRepo.create).toHaveBeenCalledWith({
      planId: "plan-1",
      interval: "annual",
      amountCents: 49900,
      currency: "brl",
      stripePriceId: "price_annual",
      lookupKey: "standard-annual",
      active: true,
    });
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        action: "subscription_changed",
        entityType: "billing_plan_price",
        entityId: newPrice.id,
        metadata: expect.objectContaining({
          operation: "create_interval_price",
          planKey: "standard",
          interval: "annual",
          stripePriceId: "price_annual",
        }),
      }),
    );
    expect(result).toEqual(newPrice);
    expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
  });
});
