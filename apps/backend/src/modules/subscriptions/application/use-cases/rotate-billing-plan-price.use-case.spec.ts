import { RotateBillingPlanPriceUseCase } from "./rotate-billing-plan-price.use-case";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { AuditService } from "../../../audit/audit.service";
import { BillingPlanNotFoundException } from "../../domain/exceptions/billing-plan-not-found.exception";
import { InvalidBillingPlanUpdateException } from "../../domain/exceptions/invalid-billing-plan-update.exception";

function buildPlan(overrides: Partial<BillingPlanEntity> = {}): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "standard-monthly",
    stripeProductId: "prod_1",
    stripePriceId: "price_old",
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

describe("RotateBillingPlanPriceUseCase", () => {
  it("throws InvalidBillingPlanUpdateException when amountCents is not a positive integer and never calls the repo/gateway", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo();
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new RotateBillingPlanPriceUseCase(
      billingPlanRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    for (const amountCents of [0, -100, 10.5]) {
      await expect(
        useCase.execute("standard-monthly", { amountCents }, "auth-1"),
      ).rejects.toThrow(InvalidBillingPlanUpdateException);
    }
    expect(billingPlanRepo.findByKey).not.toHaveBeenCalled();
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("throws BillingPlanNotFoundException when the plan doesn't exist", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(null),
    });
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new RotateBillingPlanPriceUseCase(
      billingPlanRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    await expect(
      useCase.execute("missing-plan", { amountCents: 5990 }, "auth-1"),
    ).rejects.toThrow(BillingPlanNotFoundException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("throws InvalidBillingPlanUpdateException when the plan has no lookupKey", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan({ lookupKey: null })),
    });
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new RotateBillingPlanPriceUseCase(
      billingPlanRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    await expect(
      useCase.execute("standard-monthly", { amountCents: 5990 }, "auth-1"),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("throws InvalidBillingPlanUpdateException when the plan has no stripeProductId", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest
        .fn()
        .mockResolvedValue(buildPlan({ stripeProductId: null })),
    });
    const paymentGateway = buildFakePaymentGateway();
    const useCase = new RotateBillingPlanPriceUseCase(
      billingPlanRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    await expect(
      useCase.execute("standard-monthly", { amountCents: 5990 }, "auth-1"),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
  });

  it("is a no-op when amountCents equals the current plan value (and currency/interval unchanged) — gateway is never called", async () => {
    const plan = buildPlan();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const paymentGateway = buildFakePaymentGateway();
    const auditService = buildFakeAuditService();
    const useCase = new RotateBillingPlanPriceUseCase(
      billingPlanRepo,
      paymentGateway,
      auditService,
    );

    const result = await useCase.execute(
      "standard-monthly",
      { amountCents: plan.amountCents },
      "auth-1",
    );

    expect(result).toBe(plan);
    expect(paymentGateway.createPrice).not.toHaveBeenCalled();
    expect(billingPlanRepo.updateByKey).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("rotates the price: creates the new price, persists locally, then archives the old price, in that order", async () => {
    const plan = buildPlan();
    const callOrder: string[] = [];
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
      updateByKey: jest.fn().mockImplementation(async (_key, data) => {
        callOrder.push("updateByKey");
        return buildPlan({ ...data } as Partial<BillingPlanEntity>);
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

    const useCase = new RotateBillingPlanPriceUseCase(
      billingPlanRepo,
      paymentGateway,
      auditService,
    );

    const updated = await useCase.execute(
      "standard-monthly",
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
    expect(billingPlanRepo.updateByKey).toHaveBeenCalledWith(
      "standard-monthly",
      expect.objectContaining({
        stripePriceId: "price_new",
        amountCents: 6990,
        currency: "brl",
        interval: "monthly",
      }),
    );
    expect(paymentGateway.archivePrice).toHaveBeenCalledWith("price_old");
    expect(callOrder).toEqual(["createPrice", "updateByKey", "archivePrice"]);

    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        action: "subscription_changed",
        entityType: "billing_plan",
        entityId: updated.id,
        metadata: expect.objectContaining({
          operation: "rotate_price",
          oldPriceId: "price_old",
          newPriceId: "price_new",
          oldAmountCents: 4990,
          newAmountCents: 6990,
        }),
      }),
    );
  });

  it("does not undo the local rotation nor propagate the error when archiving the old price fails", async () => {
    const plan = buildPlan();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
      updateByKey: jest.fn().mockResolvedValue(
        buildPlan({ stripePriceId: "price_new", amountCents: 6990 }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPrice: jest.fn().mockResolvedValue({ priceId: "price_new" }),
      archivePrice: jest.fn().mockRejectedValue(new Error("stripe down")),
    });
    const auditService = buildFakeAuditService();

    const useCase = new RotateBillingPlanPriceUseCase(
      billingPlanRepo,
      paymentGateway,
      auditService,
    );

    const result = await useCase.execute(
      "standard-monthly",
      { amountCents: 6990 },
      "auth-1",
    );

    expect(result.stripePriceId).toBe("price_new");
    expect(billingPlanRepo.updateByKey).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).toHaveBeenCalled();
  });
});
