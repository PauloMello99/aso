import { GrantCompUseCase } from "./grant-comp.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { IUserRepository } from "../../../user/domain/user.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { UserEntity } from "../../../user/domain/user.entity";
import { AuditService } from "../../../audit/audit.service";
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

function buildUser(overrides: Partial<Parameters<typeof UserEntity.create>[0]> = {}): UserEntity {
  return UserEntity.create({
    id: "user-1",
    authId: "auth-1",
    platformRole: "user",
    name: "Owner",
    email: "owner@example.com",
    phone: null,
    avatarUrl: null,
    birthDate: null,
    gender: null,
    onboardingCompletedAt: null,
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
    updateSubscriptionPrice: jest.fn(),
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

function buildFakeUserRepo(
  overrides: Partial<jest.Mocked<IUserRepository>> = {},
): jest.Mocked<IUserRepository> {
  return {
    findByAuthId: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IUserRepository>;
}

function buildFakeAuditService(): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
}

describe("GrantCompUseCase", () => {
  it("cancels an existing Stripe subscription before granting the comp, clearing any stale discount", async () => {
    const subscription = buildSubscription({
      stripeCouponId: "coupon_1",
      discountPercent: 20,
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest.fn().mockResolvedValue(
        buildSubscription({ type: "custom", status: "active", priceCents: 0 }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway();
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildUser()),
    });
    const auditService = buildFakeAuditService();

    const useCase = new GrantCompUseCase(
      subscriptionRepo,
      paymentGateway,
      userRepo,
      auditService,
    );

    await useCase.execute("org-1", "Isenção comercial", "auth-1", null);

    expect(paymentGateway.cancelSubscription).toHaveBeenCalledWith(
      "sub_stripe_1",
    );
    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        type: "custom",
        status: "active",
        priceCents: 0,
        compReason: "Isenção comercial",
        compGrantedBy: "user-1",
        compExpiresAt: null,
        stripeSubscriptionId: null,
        stripeCouponId: null,
        discountPercent: null,
      }),
    );
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        orgId: "org-1",
        action: "subscription_changed",
        entityType: "subscription",
        entityId: "sub-1",
        metadata: expect.objectContaining({ operation: "grant_comp" }),
      }),
    );
  });

  it("grants the comp without touching Stripe when there is no linked subscription", async () => {
    const subscription = buildSubscription({
      stripeSubscriptionId: null,
      stripeCustomerId: null,
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest.fn().mockResolvedValue(subscription),
    });
    const paymentGateway = buildFakePaymentGateway();
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildUser()),
    });
    const auditService = buildFakeAuditService();

    const useCase = new GrantCompUseCase(
      subscriptionRepo,
      paymentGateway,
      userRepo,
      auditService,
    );

    await useCase.execute("org-1", "Parceria", "auth-1");

    expect(paymentGateway.cancelSubscription).not.toHaveBeenCalled();
    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ type: "custom", compReason: "Parceria" }),
    );
  });

  it("clears a stale cancelAtPeriodEnd flag when converting the org to a comp", async () => {
    const subscription = buildSubscription({ cancelAtPeriodEnd: true });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest.fn().mockResolvedValue(
        buildSubscription({ type: "custom", status: "active", priceCents: 0 }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway();
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildUser()),
    });
    const auditService = buildFakeAuditService();

    const useCase = new GrantCompUseCase(
      subscriptionRepo,
      paymentGateway,
      userRepo,
      auditService,
    );

    await useCase.execute("org-1", "Cortesia", "auth-1", null);

    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ cancelAtPeriodEnd: false }),
    );
  });

  it("throws SubscriptionNotFoundException when the org has no subscription row", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });

    const useCase = new GrantCompUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeUserRepo(),
      buildFakeAuditService(),
    );

    await expect(
      useCase.execute("org-1", "reason", "auth-1"),
    ).rejects.toThrow(SubscriptionNotFoundException);
  });
});
