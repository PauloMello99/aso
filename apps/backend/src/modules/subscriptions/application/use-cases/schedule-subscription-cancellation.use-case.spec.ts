import { ScheduleSubscriptionCancellationUseCase } from "./schedule-subscription-cancellation.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import {
  NormalizedSubscription,
  SubscriptionEntity,
} from "../../domain/subscription.entity";
import { AuditService } from "../../../audit/audit.service";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";
import { SubscriptionNotStripeLinkedException } from "../../domain/exceptions/subscription-not-stripe-linked.exception";
import { SubscriptionNotCancelableException } from "../../domain/exceptions/subscription-not-cancelable.exception";

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

function buildNormalizedSubscription(
  overrides: Partial<NormalizedSubscription> = {},
): NormalizedSubscription {
  return {
    stripeSubscriptionId: "sub_stripe_1",
    stripeCustomerId: "cus_1",
    status: "active",
    billingInterval: "monthly",
    priceCents: 4990,
    stripePriceId: "price_1",
    stripeCouponId: null,
    discountPercent: null,
    trialEndsAt: null,
    currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
    canceledAt: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function buildFakeSubscriptionRepo(
  overrides: Partial<jest.Mocked<ISubscriptionRepository>> = {},
): jest.Mocked<ISubscriptionRepository> {
  return {
    findByOrgId: jest.fn(),
    findByStripeCustomerId: jest.fn(),
    findByStripeSubscriptionId: jest.fn(),
    findAllStripeLinked: jest.fn(),
    findExpiredComps: jest.fn(),
    findExpiredPastDue: jest.fn(),
    findMigratableByStripePriceId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISubscriptionRepository>;
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
    updateSubscriptionCancelAtPeriodEnd: jest.fn(),
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

describe("ScheduleSubscriptionCancellationUseCase", () => {
  it("toggles cancelAtPeriodEnd on the gateway and mirrors the normalized result locally", async () => {
    const subscription = buildSubscription();
    const normalized = buildNormalizedSubscription({
      cancelAtPeriodEnd: true,
      canceledAt: new Date("2026-01-15T00:00:00Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
      status: "active",
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest
        .fn()
        .mockResolvedValue(buildSubscription({ cancelAtPeriodEnd: true })),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionCancelAtPeriodEnd: jest
        .fn()
        .mockResolvedValue(normalized),
    });
    const auditService = buildFakeAuditService();

    const useCase = new ScheduleSubscriptionCancellationUseCase(
      subscriptionRepo,
      paymentGateway,
      auditService,
    );

    await useCase.execute("org-1", "auth-1");

    expect(
      paymentGateway.updateSubscriptionCancelAtPeriodEnd,
    ).toHaveBeenCalledWith("sub_stripe_1", true);
    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        cancelAtPeriodEnd: true,
        canceledAt: normalized.canceledAt,
        status: "active",
      }),
    );
  });

  it("persists a narrow payload that never carries stripeCouponId/discountPercent", async () => {
    const subscription = buildSubscription();
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest
        .fn()
        .mockResolvedValue(buildSubscription({ cancelAtPeriodEnd: true })),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionCancelAtPeriodEnd: jest
        .fn()
        .mockResolvedValue(buildNormalizedSubscription({ cancelAtPeriodEnd: true })),
    });
    const auditService = buildFakeAuditService();

    const useCase = new ScheduleSubscriptionCancellationUseCase(
      subscriptionRepo,
      paymentGateway,
      auditService,
    );

    await useCase.execute("org-1", "auth-1");

    const payload = subscriptionRepo.update.mock.calls[0]?.[1];
    expect(payload).toBeDefined();
    expect(payload).not.toHaveProperty("discountPercent");
    expect(payload).not.toHaveProperty("stripeCouponId");
    expect(payload).not.toHaveProperty("billingInterval");
    expect(payload).not.toHaveProperty("priceCents");
  });

  it("audits the change with action subscription_changed and operation schedule_cancellation", async () => {
    const subscription = buildSubscription();
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest
        .fn()
        .mockResolvedValue(buildSubscription({ cancelAtPeriodEnd: true })),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionCancelAtPeriodEnd: jest
        .fn()
        .mockResolvedValue(buildNormalizedSubscription({ cancelAtPeriodEnd: true })),
    });
    const auditService = buildFakeAuditService();

    const useCase = new ScheduleSubscriptionCancellationUseCase(
      subscriptionRepo,
      paymentGateway,
      auditService,
    );

    await useCase.execute("org-1", "auth-1");

    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        orgId: "org-1",
        action: "subscription_changed",
        entityType: "subscription",
        entityId: "sub-1",
        metadata: expect.objectContaining({
          operation: "schedule_cancellation",
        }),
      }),
    );
  });

  it("is idempotent: when cancelAtPeriodEnd is already true it returns without touching the gateway or auditing", async () => {
    const subscription = buildSubscription({ cancelAtPeriodEnd: true });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
    });
    const paymentGateway = buildFakePaymentGateway();
    const auditService = buildFakeAuditService();

    const useCase = new ScheduleSubscriptionCancellationUseCase(
      subscriptionRepo,
      paymentGateway,
      auditService,
    );

    const result = await useCase.execute("org-1", "auth-1");

    expect(result).toBe(subscription);
    expect(
      paymentGateway.updateSubscriptionCancelAtPeriodEnd,
    ).not.toHaveBeenCalled();
    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("throws SubscriptionNotStripeLinkedException when the subscription has no Stripe link", async () => {
    const subscription = buildSubscription({ stripeSubscriptionId: null });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
    });

    const useCase = new ScheduleSubscriptionCancellationUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeAuditService(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotStripeLinkedException,
    );
  });

  it("throws SubscriptionNotCancelableException when the subscription is past_due", async () => {
    const subscription = buildSubscription({ status: "past_due" });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
    });

    const useCase = new ScheduleSubscriptionCancellationUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeAuditService(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotCancelableException,
    );
  });

  it("throws SubscriptionNotFoundException when the org has no subscription row", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });

    const useCase = new ScheduleSubscriptionCancellationUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeAuditService(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotFoundException,
    );
  });
});
