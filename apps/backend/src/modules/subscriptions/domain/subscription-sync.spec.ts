import { shouldMarkTrialConsumed } from "./subscription-sync";
import { SubscriptionEntity } from "./subscription.entity";

function buildSubscription(
  overrides: Partial<Parameters<typeof SubscriptionEntity.create>[0]> = {},
): SubscriptionEntity {
  return SubscriptionEntity.create({
    id: "sub-1",
    orgId: "org-1",
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_stripe_1",
    type: "standard",
    status: "active",
    billingInterval: "monthly",
    priceCents: 4990,
    stripePriceId: "price_1",
    stripeCouponId: null,
    discountPercent: null,
    trialEndsAt: null,
    currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
    gracePeriodDays: 14,
    compReason: null,
    compGrantedBy: null,
    compExpiresAt: null,
    canceledAt: null,
    trialConsumed: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

describe("shouldMarkTrialConsumed", () => {
  it("returns true when incoming trialEndsAt is set and local trialConsumed is false", () => {
    const current = buildSubscription({ trialConsumed: false });

    const result = shouldMarkTrialConsumed(current, {
      trialEndsAt: new Date("2026-02-01T00:00:00Z"),
    });

    expect(result).toBe(true);
  });

  it("returns false when local trialConsumed is already true", () => {
    const current = buildSubscription({ trialConsumed: true });

    const result = shouldMarkTrialConsumed(current, {
      trialEndsAt: new Date("2026-02-01T00:00:00Z"),
    });

    expect(result).toBe(false);
  });

  it("returns false when incoming trialEndsAt is null", () => {
    const current = buildSubscription({ trialConsumed: false });

    const result = shouldMarkTrialConsumed(current, { trialEndsAt: null });

    expect(result).toBe(false);
  });
});
