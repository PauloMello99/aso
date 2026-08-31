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

function buildRefundRow(
  overrides: Partial<BillingRefundEventEntity> = {},
): BillingRefundEventEntity {
  return {
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
    ...overrides,
  };
}

function buildFakeSubscriptionRepo(
  overrides: Partial<jest.Mocked<ISubscriptionRepository>> = {},
): jest.Mocked<ISubscriptionRepository> {
  return {
    findByOrgId: jest.fn().mockResolvedValue(buildSubscription()),
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
    listPageByOrgId: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    findResolvedOrgIdByRefundId: jest.fn().mockResolvedValue(null),
    findResolvedOrgIdByChargeId: jest.fn().mockResolvedValue(null),
    listUnresolvedChargeIds: jest.fn().mockResolvedValue([]),
    findStatusesByRefundIds: jest.fn().mockResolvedValue(new Map()),
    resolveOrgIdWhereNull: jest.fn().mockResolvedValue(0),
    backfillOrgIdFromResolvedSiblings: jest.fn().mockResolvedValue(0),
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

    await expect(useCase.execute("org-1", {})).rejects.toThrow(
      SubscriptionNotFoundException,
    );
    expect(refundEventRepo.listPageByOrgId).not.toHaveBeenCalled();
  });

  it("applies defaults (page 1, limit 50, offset 0) when page/limit are absent", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo();
    const refundEventRepo = buildFakeRefundEventRepo({
      listPageByOrgId: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    });

    const useCase = new ListSubscriptionRefundsUseCase(
      subscriptionRepo,
      refundEventRepo,
    );

    const result = await useCase.execute("org-1", {});

    expect(refundEventRepo.listPageByOrgId).toHaveBeenCalledWith("org-1", {
      limit: 50,
      offset: 0,
    });
    expect(result.page).toBe(1);
    expect(result.pages).toBe(1);
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });

  it("returns pages: 1 (not 0) for an empty result — deliberate divergence from the AuditLogsPage mold", async () => {
    // AuditLogsPage computes `pages` as a bare `Math.ceil(total / limit)`, so
    // total 0 there yields pages 0. This envelope intentionally clamps with
    // `Math.max(1, Math.ceil(0 / limit))` so an empty list is still page 1 of 1.
    const subscriptionRepo = buildFakeSubscriptionRepo();
    const refundEventRepo = buildFakeRefundEventRepo({
      listPageByOrgId: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    });

    const useCase = new ListSubscriptionRefundsUseCase(
      subscriptionRepo,
      refundEventRepo,
    );

    const result = await useCase.execute("org-1", {});

    expect(result.pages).toBe(1);
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
    expect(result.page).toBe(1);
  });

  it("clamps limit above the ceiling to 200", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo();
    const refundEventRepo = buildFakeRefundEventRepo();

    const useCase = new ListSubscriptionRefundsUseCase(
      subscriptionRepo,
      refundEventRepo,
    );

    await useCase.execute("org-1", { limit: 5000 });

    expect(refundEventRepo.listPageByOrgId).toHaveBeenCalledWith("org-1", {
      limit: 200,
      offset: 0,
    });
  });

  it("maps rows to the public shape without id/orgId and serializes occurredAt as ISO", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo();
    const refundEventRepo = buildFakeRefundEventRepo({
      listPageByOrgId: jest
        .fn()
        .mockResolvedValue({ rows: [buildRefundRow()], total: 7 }),
    });

    const useCase = new ListSubscriptionRefundsUseCase(
      subscriptionRepo,
      refundEventRepo,
    );

    const result = await useCase.execute("org-1", {});

    expect(result.total).toBe(7);
    expect(result.pages).toBe(1);
    expect(result.data).toEqual([
      {
        stripeRefundId: "re_1",
        stripeChargeId: "ch_1",
        status: "succeeded",
        amountCents: 4990,
        currency: "brl",
        reason: "requested_by_customer",
        occurredAt: "2026-02-01T00:00:00.000Z",
      },
    ]);
    for (const row of result.data) {
      expect(row).not.toHaveProperty("id");
      expect(row).not.toHaveProperty("orgId");
    }
  });

  it("computes offset and pages for a later page", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo();
    const refundEventRepo = buildFakeRefundEventRepo({
      listPageByOrgId: jest.fn().mockResolvedValue({ rows: [], total: 120 }),
    });

    const useCase = new ListSubscriptionRefundsUseCase(
      subscriptionRepo,
      refundEventRepo,
    );

    const result = await useCase.execute("org-1", { page: 2, limit: 50 });

    expect(refundEventRepo.listPageByOrgId).toHaveBeenCalledWith("org-1", {
      limit: 50,
      offset: 50,
    });
    expect(result.page).toBe(2);
    expect(result.pages).toBe(3);
    expect(result.total).toBe(120);
  });
});
