import { ListBillingCouponsUseCase } from "./list-billing-coupons.use-case";
import {
  IBillingCouponRepository,
  BillingCouponEntity,
} from "../../domain/billing-coupon.repository.interface";

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

describe("ListBillingCouponsUseCase", () => {
  it("delegates to the repository, forwarding the filters and returning the result", async () => {
    const coupons = [buildCoupon(), buildCoupon({ id: "coupon-row-2" })];
    const billingCouponRepo = buildFakeBillingCouponRepo({
      findAll: jest.fn().mockResolvedValue(coupons),
    });
    const useCase = new ListBillingCouponsUseCase(billingCouponRepo);

    const result = await useCase.execute({ active: true });

    expect(billingCouponRepo.findAll).toHaveBeenCalledWith({ active: true });
    expect(result).toBe(coupons);
  });

  it("works without filters", async () => {
    const billingCouponRepo = buildFakeBillingCouponRepo({
      findAll: jest.fn().mockResolvedValue([]),
    });
    const useCase = new ListBillingCouponsUseCase(billingCouponRepo);

    const result = await useCase.execute();

    expect(billingCouponRepo.findAll).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([]);
  });
});
