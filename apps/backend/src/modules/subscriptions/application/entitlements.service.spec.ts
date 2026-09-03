import { EntitlementsService } from "./entitlements.service";
import { ISubscriptionRepository } from "../domain/subscription.repository.interface";
import { SubscriptionEntity } from "../domain/subscription.entity";

function buildSubscription(
  overrides: Partial<Parameters<typeof SubscriptionEntity.create>[0]> = {},
): SubscriptionEntity {
  return SubscriptionEntity.create({
    id: "sub-1",
    orgId: "org-1",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    type: "standard",
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

describe("EntitlementsService", () => {
  it("grants full access for a comp (custom) subscription regardless of compExpiresAt", async () => {
    const repo = buildFakeSubscriptionRepo({
      findByOrgId: jest
        .fn()
        .mockResolvedValue(
          buildSubscription({
            type: "custom",
            status: "active",
            compExpiresAt: new Date("2020-01-01T00:00:00Z"),
          }),
        ),
    });

    const service = new EntitlementsService(repo);

    await expect(service.resolve("org-1")).resolves.toEqual({
      plan: "standard",
      status: "active",
      source: "comp",
    });
  });

  it("grants access while trialing", async () => {
    const repo = buildFakeSubscriptionRepo({
      findByOrgId: jest
        .fn()
        .mockResolvedValue(buildSubscription({ type: "trial", status: "trialing" })),
    });

    const service = new EntitlementsService(repo);

    await expect(service.resolve("org-1")).resolves.toEqual({
      plan: "standard",
      status: "trialing",
      source: "stripe",
    });
  });

  it("grants access while active", async () => {
    const repo = buildFakeSubscriptionRepo({
      findByOrgId: jest
        .fn()
        .mockResolvedValue(buildSubscription({ status: "active" })),
    });

    const service = new EntitlementsService(repo);

    await expect(service.resolve("org-1")).resolves.toEqual({
      plan: "standard",
      status: "active",
      source: "stripe",
    });
  });

  it("still grants access during past_due (grace period)", async () => {
    const repo = buildFakeSubscriptionRepo({
      findByOrgId: jest
        .fn()
        .mockResolvedValue(buildSubscription({ status: "past_due" })),
    });

    const service = new EntitlementsService(repo);

    await expect(service.resolve("org-1")).resolves.toEqual({
      plan: "standard",
      status: "past_due",
      source: "stripe",
    });
  });

  it("locks access when canceled", async () => {
    const repo = buildFakeSubscriptionRepo({
      findByOrgId: jest
        .fn()
        .mockResolvedValue(
          buildSubscription({ type: "free", status: "canceled" }),
        ),
    });

    const service = new EntitlementsService(repo);

    await expect(service.resolve("org-1")).resolves.toEqual({
      plan: "locked",
      status: "canceled",
      source: "none",
    });
  });

  it("locks access (without throwing) when the subscription row is missing", async () => {
    const repo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });

    const service = new EntitlementsService(repo);

    await expect(service.resolve("org-1")).resolves.toEqual({
      plan: "locked",
      status: "canceled",
      source: "none",
    });
  });
});
