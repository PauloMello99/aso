import { ResumeSubscriptionUseCase } from "./resume-subscription.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import {
  NormalizedSubscription,
  SubscriptionEntity,
} from "../../domain/subscription.entity";
import { AuditService } from "../../../audit/audit.service";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";
import { SubscriptionNotStripeLinkedException } from "../../domain/exceptions/subscription-not-stripe-linked.exception";
import { SubscriptionNotResumableException } from "../../domain/exceptions/subscription-not-resumable.exception";
import { SubscriptionNotScheduledForCancellationException } from "../../domain/exceptions/subscription-not-scheduled-for-cancellation.exception";

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

describe("ResumeSubscriptionUseCase", () => {
  it("clears the scheduled cancellation on the gateway and mirrors the cleared canceledAt locally", async () => {
    const subscription = buildSubscription({
      cancelAtPeriodEnd: true,
      canceledAt: new Date("2026-01-15T00:00:00Z"),
    });
    const normalized = buildNormalizedSubscription({
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest
        .fn()
        .mockResolvedValue(buildSubscription({ cancelAtPeriodEnd: false })),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionCancelAtPeriodEnd: jest
        .fn()
        .mockResolvedValue(normalized),
    });
    const auditService = buildFakeAuditService();

    const useCase = new ResumeSubscriptionUseCase(
      subscriptionRepo,
      paymentGateway,
      auditService,
    );

    await useCase.execute("org-1", "auth-1");

    expect(
      paymentGateway.updateSubscriptionCancelAtPeriodEnd,
    ).toHaveBeenCalledWith("sub_stripe_1", false);

    const payload = subscriptionRepo.update.mock.calls[0]?.[1];
    expect(payload).toBeDefined();
    expect(payload?.cancelAtPeriodEnd).toBe(false);
    expect(payload?.canceledAt).toBeNull();
    expect(payload).not.toHaveProperty("discountPercent");
    expect(payload).not.toHaveProperty("stripeCouponId");
  });

  it("throws SubscriptionNotScheduledForCancellationException when the flag is already false, without calling the gateway", async () => {
    const subscription = buildSubscription({ cancelAtPeriodEnd: false });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
    });
    const paymentGateway = buildFakePaymentGateway();

    const useCase = new ResumeSubscriptionUseCase(
      subscriptionRepo,
      paymentGateway,
      buildFakeAuditService(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotScheduledForCancellationException,
    );
    expect(
      paymentGateway.updateSubscriptionCancelAtPeriodEnd,
    ).not.toHaveBeenCalled();
  });

  it("throws SubscriptionNotFoundException when the org has no subscription row, without calling the gateway or auditing", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });
    const paymentGateway = buildFakePaymentGateway();
    const auditService = buildFakeAuditService();

    const useCase = new ResumeSubscriptionUseCase(
      subscriptionRepo,
      paymentGateway,
      auditService,
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotFoundException,
    );
    expect(
      paymentGateway.updateSubscriptionCancelAtPeriodEnd,
    ).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("throws SubscriptionNotResumableException when the subscription is past_due, without calling the gateway or auditing", async () => {
    const subscription = buildSubscription({
      status: "past_due",
      cancelAtPeriodEnd: true,
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
    });
    const paymentGateway = buildFakePaymentGateway();
    const auditService = buildFakeAuditService();

    const useCase = new ResumeSubscriptionUseCase(
      subscriptionRepo,
      paymentGateway,
      auditService,
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotResumableException,
    );
    expect(
      paymentGateway.updateSubscriptionCancelAtPeriodEnd,
    ).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("throws SubscriptionNotStripeLinkedException when the subscription has no Stripe link", async () => {
    const subscription = buildSubscription({
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: true,
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
    });

    const useCase = new ResumeSubscriptionUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeAuditService(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotStripeLinkedException,
    );
  });

  it("audits the change with operation resume", async () => {
    const subscription = buildSubscription({ cancelAtPeriodEnd: true });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest
        .fn()
        .mockResolvedValue(buildSubscription({ cancelAtPeriodEnd: false })),
    });
    const paymentGateway = buildFakePaymentGateway({
      updateSubscriptionCancelAtPeriodEnd: jest
        .fn()
        .mockResolvedValue(
          buildNormalizedSubscription({ cancelAtPeriodEnd: false }),
        ),
    });
    const auditService = buildFakeAuditService();

    const useCase = new ResumeSubscriptionUseCase(
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
        metadata: expect.objectContaining({ operation: "resume" }),
      }),
    );
  });
});
