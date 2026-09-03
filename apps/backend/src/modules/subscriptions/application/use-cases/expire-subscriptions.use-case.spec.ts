import { ExpireSubscriptionsUseCase } from "./expire-subscriptions.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { AuditService } from "../../../audit/audit.service";

function buildSubscription(
  overrides: Partial<Parameters<typeof SubscriptionEntity.create>[0]> = {},
): SubscriptionEntity {
  return SubscriptionEntity.create({
    id: "sub-1",
    orgId: "org-1",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    type: "custom",
    status: "active",
    billingInterval: null,
    priceCents: null,
    stripePriceId: null,
    stripeCouponId: null,
    discountPercent: null,
    trialEndsAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    gracePeriodDays: 14,
    compReason: "friends and family",
    compGrantedBy: "user-1",
    compExpiresAt: new Date("2026-01-01T00:00:00Z"),
    canceledAt: null,
    cancelAtPeriodEnd: false,
    trialConsumed: false,
    createdAt: new Date("2025-12-01T00:00:00Z"),
    updatedAt: new Date("2025-12-01T00:00:00Z"),
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
    findExpiredComps: jest.fn().mockResolvedValue([]),
    findExpiredPastDue: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISubscriptionRepository>;
}

function buildFakeAuditService(): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
}

describe("ExpireSubscriptionsUseCase", () => {
  it("revokes an expired comp subscription and audits it", async () => {
    const expiredComp = buildSubscription({ cancelAtPeriodEnd: true });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findExpiredComps: jest.fn().mockResolvedValue([expiredComp]),
    });
    const auditService = buildFakeAuditService();

    const useCase = new ExpireSubscriptionsUseCase(
      subscriptionRepo,
      auditService,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        type: "free",
        status: "canceled",
        priceCents: null,
        compReason: null,
        compGrantedBy: null,
        compExpiresAt: null,
        cancelAtPeriodEnd: false,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        orgId: "org-1",
        action: "subscription_changed",
        metadata: { operation: "comp_expired" },
      }),
    );
    expect(result.compsExpired).toBe(1);
  });

  it("does not touch a perpetual comp (no compExpiresAt) or a comp not yet due", async () => {
    // findExpiredComps is a repository-level filter; the use-case simply
    // trusts whatever it returns, so an empty result means nothing changes.
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findExpiredComps: jest.fn().mockResolvedValue([]),
    });
    const auditService = buildFakeAuditService();

    const useCase = new ExpireSubscriptionsUseCase(
      subscriptionRepo,
      auditService,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
    expect(result.compsExpired).toBe(0);
  });

  it("locks a past_due subscription whose grace period has elapsed", async () => {
    const expiredPastDue = buildSubscription({
      id: "sub-2",
      orgId: "org-2",
      type: "standard",
      status: "past_due",
      compExpiresAt: null,
      cancelAtPeriodEnd: true,
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findExpiredPastDue: jest.fn().mockResolvedValue([expiredPastDue]),
    });
    const auditService = buildFakeAuditService();

    const useCase = new ExpireSubscriptionsUseCase(
      subscriptionRepo,
      auditService,
    );
    const result = await useCase.execute();

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-2",
      expect.objectContaining({
        status: "canceled",
        type: "free",
        cancelAtPeriodEnd: false,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-2",
        metadata: { operation: "grace_period_expired" },
      }),
    );
    expect(result.pastDueLocked).toBe(1);
  });

  it("continues processing after a failure on one subscription", async () => {
    const failing = buildSubscription({ id: "sub-1", orgId: "org-1" });
    const healthy = buildSubscription({ id: "sub-2", orgId: "org-2" });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findExpiredComps: jest.fn().mockResolvedValue([failing, healthy]),
      update: jest.fn().mockImplementation((orgId: string) => {
        if (orgId === "org-1") return Promise.reject(new Error("db error"));
        return Promise.resolve(healthy);
      }),
    });
    const auditService = buildFakeAuditService();

    const useCase = new ExpireSubscriptionsUseCase(
      subscriptionRepo,
      auditService,
    );
    const result = await useCase.execute();

    expect(result.compsExpired).toBe(1);
  });
});
