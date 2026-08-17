import { UpdateBillingPlanProductUseCase } from "./update-billing-plan-product.use-case";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  GatewayProduct,
  IPaymentGateway,
} from "../../domain/ports/payment-gateway.port";
import { AuditService } from "../../../audit/audit.service";
import { BillingPlanNotFoundException } from "../../domain/exceptions/billing-plan-not-found.exception";
import { InvalidBillingPlanUpdateException } from "../../domain/exceptions/invalid-billing-plan-update.exception";

function buildPlan(overrides: Partial<BillingPlanEntity> = {}): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "standard-monthly",
    stripeProductId: "prod_1",
    stripePriceId: "price_1",
    name: "Standard",
    description: "Plano padrão",
    amountCents: 4990,
    currency: "brl",
    interval: "monthly",
    active: true,
    metadata: {},
    lookupKey: "standard-monthly",
    productKey: "standard",
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
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

describe("UpdateBillingPlanProductUseCase", () => {
  it("throws BillingPlanNotFoundException when the plan doesn't exist and never calls the gateway", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(null),
    });
    const paymentGateway = buildFakePaymentGateway();

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    await expect(
      useCase.execute("missing-plan", { name: "New name" }, "auth-1"),
    ).rejects.toThrow(BillingPlanNotFoundException);
    expect(paymentGateway.updateProduct).not.toHaveBeenCalled();
  });

  it("throws InvalidBillingPlanUpdateException when the plan has no Stripe product and never calls the gateway", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest
        .fn()
        .mockResolvedValue(buildPlan({ stripeProductId: null })),
    });
    const paymentGateway = buildFakePaymentGateway();

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    await expect(
      useCase.execute("standard-monthly", { name: "New name" }, "auth-1"),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(paymentGateway.updateProduct).not.toHaveBeenCalled();
  });

  it("throws InvalidBillingPlanUpdateException when no field is informed", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const paymentGateway = buildFakePaymentGateway();

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    await expect(
      useCase.execute("standard-monthly", {}, "auth-1"),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(paymentGateway.updateProduct).not.toHaveBeenCalled();
  });

  it("throws InvalidBillingPlanUpdateException when name is blank", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const paymentGateway = buildFakePaymentGateway();

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    await expect(
      useCase.execute("standard-monthly", { name: "   " }, "auth-1"),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(paymentGateway.updateProduct).not.toHaveBeenCalled();
  });

  it("does not persist locally when the gateway call fails", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateProduct: jest.fn().mockRejectedValue(new Error("stripe down")),
    });

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    await expect(
      useCase.execute("standard-monthly", { name: "New name" }, "auth-1"),
    ).rejects.toThrow("stripe down");
    expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
  });

  it("updates the Stripe product and persists the gateway's returned data locally", async () => {
    const plan = buildPlan();
    const gatewayResult: GatewayProduct = {
      productId: "prod_1",
      name: "New name",
      description: "New description",
      metadata: { tier: "pro" },
      active: false,
    };
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
      updateByKey: jest.fn().mockResolvedValue(
        buildPlan({
          name: gatewayResult.name,
          description: gatewayResult.description,
          metadata: gatewayResult.metadata,
          active: gatewayResult.active,
        }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateProduct: jest.fn().mockResolvedValue(gatewayResult),
    });
    const auditService = buildFakeAuditService();

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      auditService,
    );

    const params = {
      name: "New name",
      description: "New description",
      metadata: { tier: "pro" },
      active: false,
    };

    await useCase.execute("standard-monthly", params, "auth-1");

    expect(paymentGateway.updateProduct).toHaveBeenCalledWith(
      "prod_1",
      params,
    );
    expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith(
      "standard-monthly",
      {
        name: "New name",
        description: "New description",
        metadata: { tier: "pro" },
        active: false,
      },
    );
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        action: "subscription_changed",
        entityType: "billing_plan",
        entityId: "plan-1",
        metadata: expect.objectContaining({
          operation: "update_product",
          changedFields: expect.arrayContaining([
            "name",
            "description",
            "metadata",
            "active",
          ]),
        }),
      }),
    );
  });
});
