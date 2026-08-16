import {
  CreateBillingCouponUseCase,
  CreateBillingCouponParams,
} from "./create-billing-coupon.use-case";
import {
  IBillingCouponRepository,
  BillingCouponEntity,
} from "../../domain/billing-coupon.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { IUserRepository } from "../../../user/domain/user.repository.interface";
import { UserEntity } from "../../../user/domain/user.entity";
import { AuditService } from "../../../audit/audit.service";
import { InvalidCouponConfigException } from "../../domain/exceptions/invalid-coupon-config.exception";

function buildUser(
  overrides: Partial<Parameters<typeof UserEntity.create>[0]> = {},
): UserEntity {
  return UserEntity.create({
    id: "user-1",
    authId: "auth-1",
    platformRole: "user",
    name: "Owner",
    email: "owner@example.com",
    phone: null,
    avatarUrl: null,
    birthDate: null,
    gender: null,
    onboardingCompletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

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

function buildFakeUserRepo(
  overrides: Partial<jest.Mocked<IUserRepository>> = {},
): jest.Mocked<IUserRepository> {
  return {
    findByAuthId: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IUserRepository>;
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
  userRepo?: jest.Mocked<IUserRepository>;
  auditService?: jest.Mocked<AuditService>;
}) {
  const paymentGateway = overrides?.paymentGateway ?? buildFakePaymentGateway();
  const billingCouponRepo =
    overrides?.billingCouponRepo ?? buildFakeBillingCouponRepo();
  const userRepo = overrides?.userRepo ?? buildFakeUserRepo();
  const auditService = overrides?.auditService ?? buildFakeAuditService();

  const useCase = new CreateBillingCouponUseCase(
    paymentGateway,
    billingCouponRepo,
    userRepo,
    auditService,
  );

  return { useCase, paymentGateway, billingCouponRepo, userRepo, auditService };
}

const validParams: CreateBillingCouponParams = {
  name: "Promo 10%",
  percentOff: 10,
  duration: "once",
  code: "PROMO10",
};

describe("CreateBillingCouponUseCase", () => {
  it("creates the Stripe coupon, the promotion code, persists locally and logs the audit entry", async () => {
    const paymentGateway = buildFakePaymentGateway({
      createCoupon: jest.fn().mockResolvedValue({ couponId: "coupon_1" }),
      createPromotionCode: jest
        .fn()
        .mockResolvedValue({ promotionCodeId: "promo_1", code: "PROMO10" }),
    });
    const billingCouponRepo = buildFakeBillingCouponRepo({
      upsertFromStripe: jest.fn().mockResolvedValue(buildCoupon()),
    });
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildUser()),
    });
    const auditService = buildFakeAuditService();

    const { useCase } = buildUseCase({
      paymentGateway,
      billingCouponRepo,
      userRepo,
      auditService,
    });

    const result = await useCase.execute(validParams, "auth-1");

    expect(paymentGateway.createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Promo 10%",
        percentOff: 10,
        duration: "once",
        durationMonths: undefined,
      }),
    );
    expect(paymentGateway.createPromotionCode).toHaveBeenCalledWith({
      couponId: "coupon_1",
      code: "PROMO10",
      maxRedemptions: undefined,
      expiresAt: undefined,
    });
    expect(billingCouponRepo.upsertFromStripe).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeCouponId: "coupon_1",
        stripePromotionCodeId: "promo_1",
        code: "PROMO10",
        createdBy: "user-1",
      }),
    );
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        action: "subscription_changed",
        entityType: "billing_coupon",
        metadata: expect.objectContaining({
          operation: "create_coupon",
          stripeCouponId: "coupon_1",
          code: "PROMO10",
        }),
      }),
    );
    expect(result).toEqual(buildCoupon());
  });

  it("rejects when both percentOff and amountOffCents are present, without calling the gateway", async () => {
    const { useCase, paymentGateway } = buildUseCase();

    await expect(
      useCase.execute(
        { ...validParams, percentOff: 10, amountOffCents: 500, currency: "brl" },
        "auth-1",
      ),
    ).rejects.toThrow(InvalidCouponConfigException);
    expect(paymentGateway.createCoupon).not.toHaveBeenCalled();
  });

  it("rejects when neither percentOff nor amountOffCents is present", async () => {
    const { useCase, paymentGateway } = buildUseCase();

    const rest: Partial<typeof validParams> = { ...validParams };
    delete rest.percentOff;
    await expect(useCase.execute(rest, "auth-1")).rejects.toThrow(
      InvalidCouponConfigException,
    );
    expect(paymentGateway.createCoupon).not.toHaveBeenCalled();
  });

  it("rejects percentOff outside the 1-100 range", async () => {
    const { useCase, paymentGateway } = buildUseCase();

    await expect(
      useCase.execute({ ...validParams, percentOff: 0 }, "auth-1"),
    ).rejects.toThrow(InvalidCouponConfigException);
    await expect(
      useCase.execute({ ...validParams, percentOff: 101 }, "auth-1"),
    ).rejects.toThrow(InvalidCouponConfigException);
    expect(paymentGateway.createCoupon).not.toHaveBeenCalled();
  });

  it("rejects amountOffCents without currency", async () => {
    const { useCase, paymentGateway } = buildUseCase();

    const rest: Partial<typeof validParams> = { ...validParams };
    delete rest.percentOff;
    await expect(
      useCase.execute({ ...rest, amountOffCents: 500 }, "auth-1"),
    ).rejects.toThrow(InvalidCouponConfigException);
    expect(paymentGateway.createCoupon).not.toHaveBeenCalled();
  });

  it("rejects duration 'repeating' without durationInMonths", async () => {
    const { useCase, paymentGateway } = buildUseCase();

    await expect(
      useCase.execute({ ...validParams, duration: "repeating" }, "auth-1"),
    ).rejects.toThrow(InvalidCouponConfigException);
    expect(paymentGateway.createCoupon).not.toHaveBeenCalled();
  });

  it("rejects durationInMonths when duration is not 'repeating'", async () => {
    const { useCase, paymentGateway } = buildUseCase();

    await expect(
      useCase.execute(
        { ...validParams, duration: "once", durationInMonths: 3 },
        "auth-1",
      ),
    ).rejects.toThrow(InvalidCouponConfigException);
    expect(paymentGateway.createCoupon).not.toHaveBeenCalled();
  });

  it("rejects expiresAt in the past", async () => {
    const { useCase, paymentGateway } = buildUseCase();

    await expect(
      useCase.execute(
        { ...validParams, expiresAt: new Date("2020-01-01T00:00:00Z") },
        "auth-1",
      ),
    ).rejects.toThrow(InvalidCouponConfigException);
    expect(paymentGateway.createCoupon).not.toHaveBeenCalled();
  });

  it("compensates by deleting the orphaned Stripe coupon and rethrows the original error when createPromotionCode fails", async () => {
    const originalError = new Error("stripe promotion code failed");
    const paymentGateway = buildFakePaymentGateway({
      createCoupon: jest.fn().mockResolvedValue({ couponId: "coupon_1" }),
      createPromotionCode: jest.fn().mockRejectedValue(originalError),
      deleteCoupon: jest.fn().mockResolvedValue(undefined),
    });
    const billingCouponRepo = buildFakeBillingCouponRepo();

    const { useCase } = buildUseCase({ paymentGateway, billingCouponRepo });

    await expect(useCase.execute(validParams, "auth-1")).rejects.toBe(
      originalError,
    );
    expect(paymentGateway.deleteCoupon).toHaveBeenCalledWith("coupon_1");
    expect(billingCouponRepo.upsertFromStripe).not.toHaveBeenCalled();
  });

  it("does not throw a unique violation when the webhook's coupon.created already inserted the local row first (race), and returns the resulting entity", async () => {
    // Regression test for the race between this use-case and
    // HandleStripeWebhookUseCase.handleCouponUpserted: the Stripe Coupon is
    // created, and before this use-case reaches its own local write, the
    // `coupon.created` webhook already ran `upsertFromStripe` and inserted a
    // row for the same `stripeCouponId` (without `createdBy`, since the
    // webhook path never knows the admin actor). `create()` is mocked to
    // reject the way a plain INSERT against `UNIQUE(stripe_coupon_id)`
    // would in that scenario — it must never be called; the use-case's own
    // local write must converge onto that row via `upsertFromStripe`
    // instead, and still surface a normal successful result (2xx) with the
    // audit entry logged.
    const paymentGateway = buildFakePaymentGateway({
      createCoupon: jest.fn().mockResolvedValue({ couponId: "coupon_1" }),
      createPromotionCode: jest
        .fn()
        .mockResolvedValue({ promotionCodeId: "promo_1", code: "PROMO10" }),
    });
    const converged = buildCoupon({ createdBy: "user-1" });
    const uniqueViolation = new Error(
      'duplicate key value violates unique constraint "billing_coupons_stripe_coupon_id_unique"',
    );
    const billingCouponRepo = buildFakeBillingCouponRepo({
      create: jest.fn().mockRejectedValue(uniqueViolation),
      upsertFromStripe: jest.fn().mockResolvedValue(converged),
    });
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildUser()),
    });
    const auditService = buildFakeAuditService();

    const { useCase } = buildUseCase({
      paymentGateway,
      billingCouponRepo,
      userRepo,
      auditService,
    });

    const result = await useCase.execute(validParams, "auth-1");

    expect(billingCouponRepo.create).not.toHaveBeenCalled();
    expect(billingCouponRepo.upsertFromStripe).toHaveBeenCalledTimes(1);
    expect(result).toEqual(converged);
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        action: "subscription_changed",
        entityType: "billing_coupon",
      }),
    );
  });
});
