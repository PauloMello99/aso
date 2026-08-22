import { PlanPriceLinkageService } from "./plan-price-linkage.service";
import { BillingPlanEntity } from "../domain/billing-plan.repository.interface";
import { BillingPlanPriceEntity } from "../domain/billing-plan-price.repository.interface";
import { IPaymentGateway } from "../domain/ports/payment-gateway.port";
import { TelemetryService } from "../../../common/telemetry/telemetry.service";

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

describe("PlanPriceLinkageService", () => {
  it("fast path: returns immediately when plan.stripeProductId and price.lookupKey are both present, without calling the gateway or telemetry", async () => {
    const gateway = buildFakePaymentGateway();
    const telemetry = buildFakeTelemetry();
    const service = new PlanPriceLinkageService(gateway, telemetry);

    const result = await service.resolve(buildPlan(), buildPrice());

    expect(result).toEqual({
      stripeProductId: "prod_1",
      lookupKey: "standard-monthly",
    });
    expect(gateway.retrievePrice).not.toHaveBeenCalled();
    expect(telemetry.captureMessage).not.toHaveBeenCalled();
  });

  it("backfills lookupKey from Stripe when it's null locally and stripePriceId exists", async () => {
    const gateway = buildFakePaymentGateway({
      retrievePrice: jest.fn().mockResolvedValue({
        priceId: "price_old",
        productId: "prod_1",
        unitAmount: 4990,
        currency: "brl",
        interval: "monthly",
        lookupKey: "standard-monthly",
        active: true,
      }),
    });
    const telemetry = buildFakeTelemetry();
    const service = new PlanPriceLinkageService(gateway, telemetry);

    const price = buildPrice({ lookupKey: null });
    const result = await service.resolve(buildPlan(), price);

    expect(result).toEqual({
      stripeProductId: "prod_1",
      lookupKey: "standard-monthly",
    });
    expect(gateway.retrievePrice).toHaveBeenCalledWith("price_old");
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      "warn",
      expect.objectContaining({
        code: "BILLING_PLAN_PRICE_LINKAGE_BACKFILLED",
        planKey: "standard",
        interval: "monthly",
        priceRowId: price.id,
        source: "stripe",
      }),
    );
  });

  it("derives lookupKey from productKey when Stripe has none and retrievePrice returns null", async () => {
    const gateway = buildFakePaymentGateway({
      retrievePrice: jest.fn().mockResolvedValue(null),
    });
    const telemetry = buildFakeTelemetry();
    const service = new PlanPriceLinkageService(gateway, telemetry);

    const price = buildPrice({ lookupKey: null });
    const result = await service.resolve(
      buildPlan({ productKey: "standard" }),
      price,
    );

    expect(result).toEqual({
      stripeProductId: "prod_1",
      lookupKey: "standard-monthly",
    });
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      "warn",
      expect.objectContaining({
        code: "BILLING_PLAN_PRICE_LINKAGE_BACKFILLED",
        source: "derived",
      }),
    );
  });

  it("returns null when lookupKey is missing, stripePriceId is null and productKey is null", async () => {
    const gateway = buildFakePaymentGateway();
    const telemetry = buildFakeTelemetry();
    const service = new PlanPriceLinkageService(gateway, telemetry);

    const price = buildPrice({ lookupKey: null, stripePriceId: null });
    const result = await service.resolve(
      buildPlan({ productKey: null }),
      price,
    );

    expect(result).toBeNull();
    expect(gateway.retrievePrice).not.toHaveBeenCalled();
    expect(telemetry.captureMessage).not.toHaveBeenCalled();
  });

  it("backfills stripeProductId from the Stripe price's productId when the plan lacks one", async () => {
    const gateway = buildFakePaymentGateway({
      retrievePrice: jest.fn().mockResolvedValue({
        priceId: "price_old",
        productId: "prod_from_stripe",
        unitAmount: 4990,
        currency: "brl",
        interval: "monthly",
        lookupKey: "standard-monthly",
        active: true,
      }),
    });
    const telemetry = buildFakeTelemetry();
    const service = new PlanPriceLinkageService(gateway, telemetry);

    const plan = buildPlan({ stripeProductId: null });
    const result = await service.resolve(plan, buildPrice());

    expect(result).toEqual({
      stripeProductId: "prod_from_stripe",
      lookupKey: "standard-monthly",
    });
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      "warn",
      expect.objectContaining({
        source: "stripe",
        backfilledFields: expect.arrayContaining(["stripeProductId"]),
      }),
    );
  });
});
