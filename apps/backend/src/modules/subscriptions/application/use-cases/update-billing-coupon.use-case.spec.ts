import {
  UpdateBillingCouponUseCase,
  UpdateBillingCouponParams,
} from "./update-billing-coupon.use-case";
import {
  BillingCouponEntity,
  IBillingCouponRepository,
} from "../../domain/billing-coupon.repository.interface";
import {
  GatewayCoupon,
  IPaymentGateway,
  UpdatedGatewayPromotionCode,
} from "../../domain/ports/payment-gateway.port";
import { AuditService } from "../../../audit/audit.service";
import { BillingCouponNotFoundException } from "../../domain/exceptions/billing-coupon-not-found.exception";
import { BillingCouponNotRedeemableException } from "../../domain/exceptions/billing-coupon-not-redeemable.exception";
import { BillingCouponCodeAlreadyExistsException } from "../../domain/exceptions/billing-coupon-code-already-exists.exception";
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

function buildGatewayPromotionCode(
  overrides: Partial<UpdatedGatewayPromotionCode> = {},
): UpdatedGatewayPromotionCode {
  return {
    promotionCodeId: "promo_1",
    active: true,
    code: "PROMO10",
    maxRedemptions: null,
    expiresAt: null,
    timesRedeemed: 0,
    ...overrides,
  };
}

function buildGatewayCoupon(
  overrides: Partial<GatewayCoupon> = {},
): GatewayCoupon {
  return {
    couponId: "coupon_1",
    name: "Promo 10%",
    percentOff: 10,
    amountOffCents: null,
    currency: null,
    duration: "once",
    durationInMonths: null,
    valid: true,
    maxRedemptions: null,
    redeemBy: null,
    timesRedeemed: 0,
    metadata: {},
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
    updateCouponMetadata: jest.fn().mockResolvedValue(true),
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

  describe("deactivation archives the coupon", () => {
    it("deactivates the promotion code FIRST and then marks the Coupon as archived via metadata", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest.fn().mockResolvedValue(buildCoupon()),
        update: jest.fn().mockResolvedValue(buildCoupon({ active: false })),
      });
      const paymentGateway = buildFakePaymentGateway({
        updatePromotionCode: jest
          .fn()
          .mockResolvedValue(buildGatewayPromotionCode({ active: false })),
        updateCouponMetadata: jest.fn().mockResolvedValue(true),
      });
      const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

      await useCase.execute("coupon-row-1", { active: false }, "auth-1");

      expect(paymentGateway.updateCouponMetadata).toHaveBeenCalledWith(
        "coupon_1",
        { aso_archived: "true" },
      );
      expect(
        paymentGateway.updatePromotionCode.mock.invocationCallOrder[0],
      ).toBeLessThan(
        paymentGateway.updateCouponMetadata.mock.invocationCallOrder[0]!,
      );
      expect(billingCouponRepo.update).toHaveBeenCalledWith("coupon-row-1", {
        active: false,
      });
      // Deactivating never needs to inspect the coupon.
      expect(paymentGateway.retrieveCoupon).not.toHaveBeenCalled();
    });

    it("keeps the code deactivated and still persists active=false when writing the archive metadata fails", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest.fn().mockResolvedValue(buildCoupon()),
        update: jest.fn().mockResolvedValue(buildCoupon({ active: false })),
      });
      const paymentGateway = buildFakePaymentGateway({
        updatePromotionCode: jest
          .fn()
          .mockResolvedValue(buildGatewayPromotionCode({ active: false })),
        updateCouponMetadata: jest
          .fn()
          .mockRejectedValue(new Error("stripe 500")),
      });
      const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

      const result = await useCase.execute(
        "coupon-row-1",
        { active: false },
        "auth-1",
      );

      expect(paymentGateway.updatePromotionCode).toHaveBeenCalledTimes(1);
      expect(paymentGateway.updatePromotionCode).toHaveBeenCalledWith(
        "promo_1",
        { active: false },
      );
      expect(billingCouponRepo.update).toHaveBeenCalledWith("coupon-row-1", {
        active: false,
      });
      expect(result.active).toBe(false);
    });

    it("tolerates the Coupon having been deleted in Stripe when marking it archived", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest.fn().mockResolvedValue(buildCoupon()),
        update: jest.fn().mockResolvedValue(buildCoupon({ active: false })),
      });
      const paymentGateway = buildFakePaymentGateway({
        updatePromotionCode: jest
          .fn()
          .mockResolvedValue(buildGatewayPromotionCode({ active: false })),
        updateCouponMetadata: jest.fn().mockResolvedValue(false),
      });
      const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

      await expect(
        useCase.execute("coupon-row-1", { active: false }, "auth-1"),
      ).resolves.toEqual(buildCoupon({ active: false }));
      expect(billingCouponRepo.update).toHaveBeenCalledWith("coupon-row-1", {
        active: false,
      });
    });

    it("does not touch the local row or the Coupon metadata when the promotion code update fails", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest.fn().mockResolvedValue(buildCoupon()),
      });
      const paymentGateway = buildFakePaymentGateway({
        updatePromotionCode: jest
          .fn()
          .mockRejectedValue(new Error("stripe 500")),
      });
      const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

      await expect(
        useCase.execute("coupon-row-1", { active: false }, "auth-1"),
      ).rejects.toThrow("stripe 500");
      expect(paymentGateway.updateCouponMetadata).not.toHaveBeenCalled();
      expect(billingCouponRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("activation", () => {
    it("reactivates the code and clears the archive marker when the Coupon is still valid", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest
          .fn()
          .mockResolvedValue(buildCoupon({ active: false })),
        update: jest.fn().mockResolvedValue(buildCoupon({ active: true })),
      });
      const paymentGateway = buildFakePaymentGateway({
        retrieveCoupon: jest
          .fn()
          .mockResolvedValue(buildGatewayCoupon({ valid: true })),
        retrievePromotionCode: jest
          .fn()
          .mockResolvedValue(buildGatewayPromotionCode({ active: false })),
        updatePromotionCode: jest
          .fn()
          .mockResolvedValue(buildGatewayPromotionCode({ active: true })),
        updateCouponMetadata: jest.fn().mockResolvedValue(true),
      });
      const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

      await useCase.execute("coupon-row-1", { active: true }, "auth-1");

      expect(paymentGateway.retrieveCoupon).toHaveBeenCalledWith("coupon_1");
      expect(paymentGateway.retrievePromotionCode).toHaveBeenCalledWith(
        "promo_1",
      );
      expect(paymentGateway.updatePromotionCode).toHaveBeenCalledWith(
        "promo_1",
        { active: true },
      );
      expect(paymentGateway.updateCouponMetadata).toHaveBeenCalledWith(
        "coupon_1",
        { aso_archived: "false" },
      );
      expect(billingCouponRepo.update).toHaveBeenCalledWith("coupon-row-1", {
        active: true,
      });
    });

    it("refuses to reactivate an exhausted/expired Coupon (valid=false) without writing anything", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest
          .fn()
          .mockResolvedValue(buildCoupon({ active: false })),
      });
      const paymentGateway = buildFakePaymentGateway({
        retrieveCoupon: jest
          .fn()
          .mockResolvedValue(buildGatewayCoupon({ valid: false })),
      });
      const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

      await expect(
        useCase.execute("coupon-row-1", { active: true }, "auth-1"),
      ).rejects.toThrow(BillingCouponNotRedeemableException);
      expect(paymentGateway.updatePromotionCode).not.toHaveBeenCalled();
      expect(paymentGateway.updateCouponMetadata).not.toHaveBeenCalled();
      expect(billingCouponRepo.update).not.toHaveBeenCalled();
    });

    it("refuses to reactivate when the Coupon no longer exists in Stripe", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest
          .fn()
          .mockResolvedValue(buildCoupon({ active: false })),
      });
      const paymentGateway = buildFakePaymentGateway({
        retrieveCoupon: jest.fn().mockResolvedValue(null),
      });
      const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

      await expect(
        useCase.execute("coupon-row-1", { active: true }, "auth-1"),
      ).rejects.toThrow(BillingCouponNotRedeemableException);
      expect(paymentGateway.updatePromotionCode).not.toHaveBeenCalled();
    });

    describe("code-level redeemability pre-check (Coupon still valid)", () => {
      async function expectRefusedWithoutWrites(
        remoteCode: ReturnType<typeof buildGatewayPromotionCode> | null,
      ): Promise<void> {
        const billingCouponRepo = buildFakeBillingCouponRepo({
          findById: jest
            .fn()
            .mockResolvedValue(buildCoupon({ active: false })),
        });
        const paymentGateway = buildFakePaymentGateway({
          retrieveCoupon: jest
            .fn()
            .mockResolvedValue(buildGatewayCoupon({ valid: true })),
          retrievePromotionCode: jest.fn().mockResolvedValue(remoteCode),
        });
        const { useCase, auditService } = buildUseCase({
          billingCouponRepo,
          paymentGateway,
        });

        await expect(
          useCase.execute("coupon-row-1", { active: true }, "auth-1"),
        ).rejects.toThrow(BillingCouponNotRedeemableException);
        expect(paymentGateway.retrievePromotionCode).toHaveBeenCalledWith(
          "promo_1",
        );
        expect(paymentGateway.updatePromotionCode).not.toHaveBeenCalled();
        expect(paymentGateway.updateCouponMetadata).not.toHaveBeenCalled();
        expect(billingCouponRepo.update).not.toHaveBeenCalled();
        expect(auditService.logByAuthId).not.toHaveBeenCalled();
      }

      it("refuses to reactivate a code that reached its own max_redemptions", async () => {
        await expectRefusedWithoutWrites(
          buildGatewayPromotionCode({
            active: false,
            maxRedemptions: 5,
            timesRedeemed: 5,
          }),
        );
      });

      it("refuses to reactivate a code whose expires_at has passed", async () => {
        await expectRefusedWithoutWrites(
          buildGatewayPromotionCode({
            active: false,
            expiresAt: new Date(Date.now() - 60_000),
          }),
        );
      });

      it("refuses to reactivate when the promotion code no longer exists in Stripe", async () => {
        await expectRefusedWithoutWrites(null);
      });

      it("allows reactivation when the code still has redemptions left and has not expired", async () => {
        const billingCouponRepo = buildFakeBillingCouponRepo({
          findById: jest
            .fn()
            .mockResolvedValue(buildCoupon({ active: false })),
          update: jest.fn().mockResolvedValue(buildCoupon({ active: true })),
        });
        const paymentGateway = buildFakePaymentGateway({
          retrieveCoupon: jest
            .fn()
            .mockResolvedValue(buildGatewayCoupon({ valid: true })),
          retrievePromotionCode: jest.fn().mockResolvedValue(
            buildGatewayPromotionCode({
              active: false,
              maxRedemptions: 5,
              timesRedeemed: 4,
              expiresAt: new Date(Date.now() + 86_400_000),
            }),
          ),
          updatePromotionCode: jest
            .fn()
            .mockResolvedValue(buildGatewayPromotionCode({ active: true })),
        });
        const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

        await useCase.execute("coupon-row-1", { active: true }, "auth-1");

        expect(paymentGateway.updatePromotionCode).toHaveBeenCalledWith(
          "promo_1",
          { active: true },
        );
      });
    });

    it("rejects reactivation with BILLING_COUPON_CODE_ALREADY_EXISTS when another ACTIVE coupon holds the code, before touching Stripe", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest
          .fn()
          .mockResolvedValue(buildCoupon({ active: false })),
        findByCode: jest
          .fn()
          .mockResolvedValue(
            buildCoupon({ id: "coupon-row-2", active: true }),
          ),
      });
      const { useCase, paymentGateway } = buildUseCase({ billingCouponRepo });

      await expect(
        useCase.execute("coupon-row-1", { active: true }, "auth-1"),
      ).rejects.toThrow(BillingCouponCodeAlreadyExistsException);
      expect(billingCouponRepo.findByCode).toHaveBeenCalledWith("PROMO10");
      expect(paymentGateway.retrieveCoupon).not.toHaveBeenCalled();
      expect(paymentGateway.retrievePromotionCode).not.toHaveBeenCalled();
      expect(paymentGateway.updatePromotionCode).not.toHaveBeenCalled();
      expect(billingCouponRepo.update).not.toHaveBeenCalled();
    });

    it("does not look up the code holder when deactivating", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest.fn().mockResolvedValue(buildCoupon({ active: true })),
        update: jest.fn().mockResolvedValue(buildCoupon({ active: false })),
      });
      const paymentGateway = buildFakePaymentGateway({
        updatePromotionCode: jest
          .fn()
          .mockResolvedValue(buildGatewayPromotionCode({ active: false })),
      });
      const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

      await useCase.execute("coupon-row-1", { active: false }, "auth-1");

      expect(billingCouponRepo.findByCode).not.toHaveBeenCalled();
    });

    it("propagates the duplicate-code error when Stripe refuses the reactivation, leaving the local row untouched", async () => {
      const billingCouponRepo = buildFakeBillingCouponRepo({
        findById: jest
          .fn()
          .mockResolvedValue(buildCoupon({ active: false })),
      });
      const paymentGateway = buildFakePaymentGateway({
        retrieveCoupon: jest
          .fn()
          .mockResolvedValue(buildGatewayCoupon({ valid: true })),
        retrievePromotionCode: jest
          .fn()
          .mockResolvedValue(buildGatewayPromotionCode({ active: false })),
        updatePromotionCode: jest
          .fn()
          .mockRejectedValue(new BillingCouponCodeAlreadyExistsException()),
      });
      const { useCase } = buildUseCase({ billingCouponRepo, paymentGateway });

      await expect(
        useCase.execute("coupon-row-1", { active: true }, "auth-1"),
      ).rejects.toThrow(BillingCouponCodeAlreadyExistsException);
      expect(paymentGateway.updateCouponMetadata).not.toHaveBeenCalled();
      expect(billingCouponRepo.update).not.toHaveBeenCalled();
    });
  });
});
