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
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";

function buildPlan(
  overrides: Partial<BillingPlanEntity> = {},
): BillingPlanEntity {
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
    highlighted: false,
    features: [],
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

function buildFakeRevalidationClient(): jest.Mocked<FrontendRevalidationClient> {
  return {
    revalidate: jest.fn(),
  } as unknown as jest.Mocked<FrontendRevalidationClient>;
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
      buildFakeRevalidationClient(),
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
      buildFakeRevalidationClient(),
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
      buildFakeRevalidationClient(),
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
      buildFakeRevalidationClient(),
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
      buildFakeRevalidationClient(),
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
    const revalidationClient = buildFakeRevalidationClient();

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      auditService,
      revalidationClient,
    );

    const params = {
      name: "New name",
      description: "New description",
      metadata: { tier: "pro" },
      active: false,
    };

    await useCase.execute("standard-monthly", params, "auth-1");

    expect(paymentGateway.updateProduct).toHaveBeenCalledWith("prod_1", params);
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
    expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
  });

  it("includes highlighted alongside Stripe-updated fields and calls both updateProduct and revalidate", async () => {
    const plan = buildPlan();
    const gatewayResult: GatewayProduct = {
      productId: "prod_1",
      name: "New name",
      description: plan.description,
      metadata: plan.metadata,
      active: plan.active,
    };
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
      updateByKey: jest.fn().mockResolvedValue(
        buildPlan({ name: gatewayResult.name, highlighted: true }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateProduct: jest.fn().mockResolvedValue(gatewayResult),
    });
    const auditService = buildFakeAuditService();
    const revalidationClient = buildFakeRevalidationClient();

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      auditService,
      revalidationClient,
    );

    await useCase.execute(
      "standard-monthly",
      { name: "New name", highlighted: true },
      "auth-1",
    );

    expect(paymentGateway.updateProduct).toHaveBeenCalledWith("prod_1", {
      name: "New name",
    });
    expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith(
      "standard-monthly",
      expect.objectContaining({
        name: gatewayResult.name,
        highlighted: true,
      }),
    );
    expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
  });

  it("persists highlighted/features locally without calling the Stripe gateway when no Stripe field is informed", async () => {
    const plan = buildPlan();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
      updateByKey: jest.fn().mockResolvedValue(
        buildPlan({ highlighted: true, features: ["Feature A"] }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway();
    const auditService = buildFakeAuditService();
    const revalidationClient = buildFakeRevalidationClient();

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      auditService,
      revalidationClient,
    );

    await useCase.execute(
      "standard-monthly",
      { highlighted: true, features: ["Feature A"] },
      "auth-1",
    );

    expect(paymentGateway.updateProduct).not.toHaveBeenCalled();
    expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith(
      "standard-monthly",
      { highlighted: true, features: ["Feature A"] },
    );
    expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
  });

  it("does not call revalidate when local persistence fails", async () => {
    const plan = buildPlan();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
      updateByKey: jest.fn().mockRejectedValue(new Error("db down")),
    });
    const paymentGateway = buildFakePaymentGateway();
    const auditService = buildFakeAuditService();
    const revalidationClient = buildFakeRevalidationClient();

    const useCase = new UpdateBillingPlanProductUseCase(
      billingPlanRepo,
      paymentGateway,
      auditService,
      revalidationClient,
    );

    await expect(
      useCase.execute("standard-monthly", { highlighted: true }, "auth-1"),
    ).rejects.toThrow("db down");
    expect(revalidationClient.revalidate).not.toHaveBeenCalled();
  });
});
