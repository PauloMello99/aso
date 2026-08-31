import { ListSubscriptionRefundsUseCase } from "./list-subscription-refunds.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import {
  BillingRefundEventEntity,
  IBillingRefundEventRepository,
} from "../../domain/billing-refund-event.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";

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
    currentPeriodStart: null,
    currentPeriodEnd: null,
    gracePeriodDays: 14,
    compReason: null,
    compGrantedBy: null,
    compExpiresAt: null,
    canceledAt: null,
    cancelAtPeriodEnd: false,
    trialConsumed: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeSubscriptionRepo(
  overrides: Partial<jest.Mocked<ISubscriptionRepository>> = {},
): jest.Mocked<ISubscriptionRepository> {
  return {
    findByOrgId: jest.fn(),
    findByStripeCustomerId: jest.fn(),
    findByStripeSubscriptionId: jest.fn(),
    findAllStripeLinked: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISubscriptionRepository>;
}

function buildFakeRefundEventRepo(
  overrides: Partial<jest.Mocked<IBillingRefundEventRepository>> = {},
): jest.Mocked<IBillingRefundEventRepository> {
  return {
    create: jest.fn(),
    listByOrgId: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<IBillingRefundEventRepository>;
}

describe("ListSubscriptionRefundsUseCase", () => {
  it("throws SubscriptionNotFoundException when there is no subscription row", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });
    const refundEventRepo = buildFakeRefundEventRepo();

    const useCase = new ListSubscriptionRefundsUseCase(
      subscriptionRepo,
      refundEventRepo,
    );

    await expect(useCase.execute("org-1")).rejects.toThrow(
      SubscriptionNotFoundException,
    );
    expect(refundEventRepo.listByOrgId).not.toHaveBeenCalled();
  });

  it("returns the local refund events for the org when a subscription exists", async () => {
    const rows: BillingRefundEventEntity[] = [
      {
        id: "rf-1",
        stripeRefundId: "re_1",
        stripeChargeId: "ch_1",
        orgId: "org-1",
        status: "succeeded",
        amountCents: 4990,
        currency: "brl",
        reason: "requested_by_customer",
        occurredAt: new Date("2026-02-01T00:00:00Z"),
        createdAt: new Date("2026-02-01T00:00:01Z"),
      },
    ];
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(buildSubscription()),
    });
    const refundEventRepo = buildFakeRefundEventRepo({
      listByOrgId: jest.fn().mockResolvedValue(rows),
    });

    const useCase = new ListSubscriptionRefundsUseCase(
      subscriptionRepo,
      refundEventRepo,
    );

    const result = await useCase.execute("org-1");

    expect(refundEventRepo.listByOrgId).toHaveBeenCalledWith("org-1");
    expect(result).toBe(rows);
  });
});
