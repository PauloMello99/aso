import {
  UpdateBillingCouponUseCase,
  UpdateBillingCouponParams,
} from "./update-billing-coupon.use-case";
import {
  BillingCouponEntity,
  IBillingCouponRepository,
} from "../../domain/billing-coupon.repository.interface";
import {
  IPaymentGateway,
  UpdatedGatewayPromotionCode,
} from "../../domain/ports/payment-gateway.port";
import { AuditService } from "../../../audit/audit.service";
import { BillingCouponNotFoundException } from "../../domain/exceptions/billing-coupon-not-found.exception";
import { InvalidCouponConfigException } from "../../domain/exceptions/invalid-coupon-config.exception";

function buildCoupon(
  overrides: Partial<BillingCouponEntity> = {},
): BillingCouponEntity {
  return {
    id: "coupon-row-1",
    stripeCouponId: "coupon_1",
    stripePromotionCodeId: "promo_1",
    code: "PROMO10",
    name: "Promo 10%",
    percentOff: 10,
    amountOffCents: null,
    currency: null,
    duration: "once",
    durationInMonths: null,
    maxRedemptions: null,
    timesRedeemed: 0,
    expiresAt: null,
    active: true,
    createdBy: "user-1",
    lastSyncedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildFakeBillingCouponRepo(
  overrides: Partial<jest.Mocked<IBillingCouponRepository>> = {},
): jest.Mocked<IBillingCouponRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByStripeCouponId: jest.fn(),
    findByStripePromotionCodeId: jest.fn(),
    findByCode: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    upsertFromStripe: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingCouponRepository>;
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

function buildUseCase(overrides?: {
  billingCouponRepo?: jest.Mocked<IBillingCouponRepository>;
  paymentGateway?: jest.Mocked<IPaymentGateway>;
  auditService?: jest.Mocked<AuditService>;
}) {
  const paymentGateway = overrides?.paymentGateway ?? buildFakePaymentGateway();
  const billingCouponRepo =
    overrides?.billingCouponRepo ?? buildFakeBillingCouponRepo();
  const auditService = overrides?.auditService ?? buildFakeAuditService();

  const useCase = new UpdateBillingCouponUseCase(
    paymentGateway,
    billingCouponRepo,
    auditService,
  );

  return { useCase, paymentGateway, billingCouponRepo, auditService };
}

describe("UpdateBillingCouponUseCase", () => {
  it("throws BillingCouponNotFoundException when the coupon doesn't exist and never calls the gateway", async () => {
    const billingCouponRepo = buildFakeBillingCouponRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const { useCase, paymentGateway } = buildUseCase({ billingCouponRepo });

    await expect(
      useCase.execute("missing-coupon", { active: false }, "auth-1"),
    ).rejects.toThrow(BillingCouponNotFoundException);
    expect(paymentGateway.updatePromotionCode).not.toHaveBeenCalled();
  });

  it("rejects unsupported fields without calling the gateway", async () => {
    const billingCouponRepo = buildFakeBillingCouponRepo({
      findById: jest.fn().mockResolvedValue(buildCoupon()),
    });
    const { useCase, paymentGateway } = buildUseCase({ billingCouponRepo });

    await expect(
      useCase.execute(
        "coupon-row-1",
        { percentOff: 20 } as unknown as UpdateBillingCouponParams,
        "auth-1",
      ),
    ).rejects.toThrow(InvalidCouponConfigException);
    expect(paymentGateway.updatePromotionCode).not.toHaveBeenCalled();
  });

  it("throws InvalidCouponConfigException when no field is informed", async () => {
    const billingCouponRepo = buildFakeBillingCouponRepo({
      findById: jest.fn().mockResolvedValue(buildCoupon()),
    });
    const { useCase, paymentGateway } = buildUseCase({ billingCouponRepo });

    await expect(useCase.execute("coupon-row-1", {}, "auth-1")).rejects.toThrow(
      InvalidCouponConfigException,
    );
    expect(paymentGateway.updatePromotionCode).not.toHaveBeenCalled();
  });

  it("throws InvalidCouponConfigException when the coupon has no promotion code", async () => {
    const billingCouponRepo = buildFakeBillingCouponRepo({
      findById: jest
        .fn()
        .mockResolvedValue(buildCoupon({ stripePromotionCodeId: null })),
    });
    const { useCase, paymentGateway } = buildUseCase({ billingCouponRepo });

    await expect(
      useCase.execute("coupon-row-1", { active: false }, "auth-1"),
    ).rejects.toThrow(InvalidCouponConfigException);
    expect(paymentGateway.updatePromotionCode).not.toHaveBeenCalled();
  });

  it("updates the Stripe promotion code and persists the gateway's returned active flag locally", async () => {
    const coupon = buildCoupon();
    const gatewayResult: UpdatedGatewayPromotionCode = {
      promotionCodeId: "promo_1",
      active: false,
      code: "PROMO10",
      maxRedemptions: null,
      expiresAt: null,
      timesRedeemed: 0,
    };
    const billingCouponRepo = buildFakeBillingCouponRepo({
      findById: jest.fn().mockResolvedValue(coupon),
      update: jest.fn().mockResolvedValue(buildCoupon({ active: false })),
    });
    const paymentGateway = buildFakePaymentGateway({
      updatePromotionCode: jest.fn().mockResolvedValue(gatewayResult),
    });
    const auditService = buildFakeAuditService();

    const { useCase } = buildUseCase({
      billingCouponRepo,
      paymentGateway,
      auditService,
    });

    const result = await useCase.execute(
      "coupon-row-1",
      { active: false },
      "auth-1",
    );

    expect(paymentGateway.updatePromotionCode).toHaveBeenCalledWith("promo_1", {
      active: false,
    });
    expect(billingCouponRepo.update).toHaveBeenCalledWith("coupon-row-1", {
      active: false,
    });
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        action: "subscription_changed",
        entityType: "billing_coupon",
        entityId: "coupon-row-1",
        metadata: expect.objectContaining({
          operation: "update_coupon",
          changedFields: ["active"],
        }),
      }),
    );
    expect(result).toEqual(buildCoupon({ active: false }));
  });
});
