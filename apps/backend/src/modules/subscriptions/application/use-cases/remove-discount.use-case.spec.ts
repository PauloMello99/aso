import { RemoveDiscountUseCase } from "./remove-discount.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { AuditService } from "../../../audit/audit.service";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";
import { SubscriptionNotStripeLinkedException } from "../../domain/exceptions/subscription-not-stripe-linked.exception";

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
    stripeCouponId: "coupon_1",
    discountPercent: 20,
    trialEndsAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
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

function buildFakeAuditService(): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
}

describe("RemoveDiscountUseCase", () => {
  it("throws SubscriptionNotFoundException when there is no subscription row", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });

    const useCase = new RemoveDiscountUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeAuditService(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotFoundException,
    );
  });

  it("throws SubscriptionNotStripeLinkedException when the subscription isn't linked", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(
        buildSubscription({ stripeCustomerId: null, stripeSubscriptionId: null }),
      ),
    });

    const useCase = new RemoveDiscountUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeAuditService(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotStripeLinkedException,
    );
  });

  it("removes the coupon from Stripe and clears the local discount cache", async () => {
    const subscription = buildSubscription();
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest.fn().mockResolvedValue(
        buildSubscription({ stripeCouponId: null, discountPercent: null }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway();
    const auditService = buildFakeAuditService();

    const useCase = new RemoveDiscountUseCase(
      subscriptionRepo,
      paymentGateway,
      auditService,
    );

    await useCase.execute("org-1", "auth-1");

    expect(paymentGateway.removeSubscriptionDiscount).toHaveBeenCalledWith(
      "sub_stripe_1",
    );
    expect(subscriptionRepo.update).toHaveBeenCalledWith("org-1", {
      stripeCouponId: null,
      discountPercent: null,
    });
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        action: "subscription_changed",
        metadata: expect.objectContaining({ operation: "remove_discount" }),
      }),
    );
  });
});
