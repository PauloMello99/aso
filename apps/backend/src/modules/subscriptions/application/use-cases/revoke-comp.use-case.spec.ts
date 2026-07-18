import { RevokeCompUseCase } from "./revoke-comp.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { AuditService } from "../../../audit/audit.service";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";

function buildSubscription(
  overrides: Partial<Parameters<typeof SubscriptionEntity.create>[0]> = {},
): SubscriptionEntity {
  return SubscriptionEntity.create({
    id: "sub-1",
    orgId: "org-1",
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: null,
    type: "custom",
    status: "active",
    billingInterval: null,
    priceCents: 0,
    stripePriceId: null,
    stripeCouponId: null,
    discountPercent: null,
    trialEndsAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    gracePeriodDays: 14,
    compReason: "Isenção comercial",
    compGrantedBy: "user-1",
    compExpiresAt: null,
    canceledAt: null,
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

function buildFakeAuditService(): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
}

describe("RevokeCompUseCase", () => {
  it("reverts the comp back to a free/canceled subscription, preserving stripeCustomerId", async () => {
    const subscription = buildSubscription();
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest.fn().mockResolvedValue(
        buildSubscription({
          type: "free",
          status: "canceled",
          priceCents: null,
          compReason: null,
          compGrantedBy: null,
          compExpiresAt: null,
        }),
      ),
    });
    const auditService = buildFakeAuditService();

    const useCase = new RevokeCompUseCase(subscriptionRepo, auditService);

    await useCase.execute("org-1", "auth-1");

    expect(subscriptionRepo.update).toHaveBeenCalledWith("org-1", {
      type: "free",
      status: "canceled",
      priceCents: null,
      compReason: null,
      compGrantedBy: null,
      compExpiresAt: null,
    });
    // stripeCustomerId must not appear in the update payload, so it stays untouched.
    expect(subscriptionRepo.update.mock.calls[0][1]).not.toHaveProperty(
      "stripeCustomerId",
    );
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        orgId: "org-1",
        action: "subscription_changed",
        entityType: "subscription",
        entityId: "sub-1",
        metadata: expect.objectContaining({ operation: "revoke_comp" }),
      }),
    );
  });

  it("throws SubscriptionNotFoundException when the org has no subscription row", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });

    const useCase = new RevokeCompUseCase(
      subscriptionRepo,
      buildFakeAuditService(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotFoundException,
    );
  });
});
