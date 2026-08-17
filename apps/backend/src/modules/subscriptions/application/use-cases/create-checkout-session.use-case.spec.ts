import { ConfigService } from "@nestjs/config";
import { CreateCheckoutSessionUseCase } from "./create-checkout-session.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import {
  IBillingPlanRepository,
  BillingPlanEntity,
} from "../../domain/billing-plan.repository.interface";
import {
  IBillingPlanPriceRepository,
  BillingPlanPriceEntity,
} from "../../domain/billing-plan-price.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { OrgEntity } from "../../../organizations/domain/org.entity";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";
import { PlanNotAvailableException } from "../../domain/exceptions/plan-not-available.exception";
import { PlanIntervalNotEnabledException } from "../../domain/exceptions/plan-interval-not-enabled.exception";

function buildSubscription(
  overrides: Partial<Parameters<typeof SubscriptionEntity.create>[0]> = {},
): SubscriptionEntity {
  return SubscriptionEntity.create({
    id: "sub-1",
    orgId: "org-1",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    type: "free",
    status: "canceled",
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
    trialConsumed: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildOrg(
  overrides: Partial<Parameters<typeof OrgEntity.create>[0]> = {},
): OrgEntity {
  return OrgEntity.create({
    id: "org-1",
    name: "Studio Exemplo",
    slug: "studio-exemplo",
    logoUrl: null,
    role: "owner",
    permissions: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildMember(
  overrides: Partial<Parameters<typeof MemberEntity.create>[0]> = {},
): MemberEntity {
  return MemberEntity.create({
    memberId: "member-1",
    orgId: "org-1",
    userId: "user-1",
    role: "owner",
    enabled: true,
    permissions: [],
    userName: "Owner",
    userEmail: "owner@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildPlan(
  overrides: Partial<BillingPlanEntity> = {},
): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "standard",
    stripeProductId: "prod_1",
    stripePriceId: "price_1",
    name: "PadrÃ£o",
    description: null,
    amountCents: 4990,
    currency: "brl",
    interval: "monthly",
    active: true,
    metadata: {},
    lookupKey: null,
    productKey: null,
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildPlanPrice(
  overrides: Partial<BillingPlanPriceEntity> = {},
): BillingPlanPriceEntity {
  return {
    id: "price-row-1",
    planId: "plan-1",
    interval: "monthly",
    amountCents: 4990,
    currency: "brl",
    stripePriceId: "price_1",
    lookupKey: null,
    active: true,
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildFakeBillingPlanPriceRepo(
  overrides: Partial<jest.Mocked<IBillingPlanPriceRepository>> = {},
): jest.Mocked<IBillingPlanPriceRepository> {
  return {
    findActiveByPlanId: jest.fn(),
    findAllByPlanId: jest.fn(),
    findActiveByPlanIdAndInterval: jest
      .fn()
      .mockResolvedValue(buildPlanPrice()),
    findByPlanIdAndInterval: jest.fn(),
    findByStripePriceId: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deactivateById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanPriceRepository>;
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

function buildFakeBillingPlanRepo(
  overrides: Partial<jest.Mocked<IBillingPlanRepository>> = {},
): jest.Mocked<IBillingPlanRepository> {
  return {
    findByKey: jest.fn(),
    findAll: jest.fn(),
    upsert: jest.fn(),
    findByStripeProductId: jest.fn(),
    findByStripePriceId: jest.fn(),
    updateByKey: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanRepository>;
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

function buildFakeOrgRepo(
  overrides: Partial<jest.Mocked<IOrganizationRepository>> = {},
): jest.Mocked<IOrganizationRepository> {
  return {
    findAllByAuthId: jest.fn(),
    findByIdAndAuthId: jest.fn(),
    findBySlugAndAuthId: jest.fn(),
    isOwner: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IOrganizationRepository>;
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn(),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest.fn(),
    updateRole: jest.fn(),
    updatePermissions: jest.fn(),
    setEnabled: jest.fn(),
    countActiveOwners: jest.fn(),
    countOwnedOrgs: jest.fn(),
    removeAllByUserId: jest.fn(),
    transferOwnership: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberRepository>;
}

function buildConfig(): jest.Mocked<ConfigService> {
  return {
    getOrThrow: jest.fn().mockReturnValue("https://app.assessorink-so.test"),
  } as unknown as jest.Mocked<ConfigService>;
}

describe("CreateCheckoutSessionUseCase", () => {
  it("reuses the existing Stripe customer when already linked", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(
        buildSubscription({ stripeCustomerId: "cus_1", trialConsumed: true }),
      ),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const paymentGateway = buildFakePaymentGateway({
      createCheckoutSession: jest
        .fn()
        .mockResolvedValue({ url: "https://checkout.stripe.com/1", sessionId: "cs_1" }),
    });
    const orgRepo = buildFakeOrgRepo({
      findByIdAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });

    const useCase = new CreateCheckoutSessionUseCase(
      subscriptionRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      paymentGateway,
      orgRepo,
      memberRepo,
      buildConfig(),
    );

    const result = await useCase.execute("org-1", "auth-1");

    expect(result).toEqual({ url: "https://checkout.stripe.com/1" });
    expect(paymentGateway.createCustomer).not.toHaveBeenCalled();
    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(billingPlanPriceRepo.findActiveByPlanIdAndInterval).toHaveBeenCalledWith(
      "plan-1",
      "monthly",
    );
    expect(paymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_1", priceId: "price_1" }),
    );
  });

  it("resolves the price for an explicit non-default interval", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(
        buildSubscription({ stripeCustomerId: "cus_1", trialConsumed: true }),
      ),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(
        buildPlanPrice({ interval: "annual", stripePriceId: "price_annual" }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway({
      createCheckoutSession: jest
        .fn()
        .mockResolvedValue({ url: "https://checkout.stripe.com/annual", sessionId: "cs_a" }),
    });
    const orgRepo = buildFakeOrgRepo({
      findByIdAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });

    const useCase = new CreateCheckoutSessionUseCase(
      subscriptionRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      paymentGateway,
      orgRepo,
      memberRepo,
      buildConfig(),
    );

    const result = await useCase.execute("org-1", "auth-1", "annual");

    expect(billingPlanPriceRepo.findActiveByPlanIdAndInterval).toHaveBeenCalledWith(
      "plan-1",
      "annual",
    );
    expect(paymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ priceId: "price_annual" }),
    );
    expect(result).toEqual({ url: "https://checkout.stripe.com/annual" });
  });

  it("throws PlanIntervalNotEnabledException when the requested interval has no active price", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(buildSubscription()),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
    });
    const orgRepo = buildFakeOrgRepo({
      findByIdAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });

    const useCase = new CreateCheckoutSessionUseCase(
      subscriptionRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakePaymentGateway(),
      orgRepo,
      memberRepo,
      buildConfig(),
    );

    await expect(
      useCase.execute("org-1", "auth-1", "semiannual"),
    ).rejects.toThrow(PlanIntervalNotEnabledException);
  });

  it("creates a new Stripe customer when the subscription has none yet", async () => {
    const subscription = buildSubscription({
      stripeCustomerId: null,
      trialConsumed: true,
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
      update: jest
        .fn()
        .mockResolvedValue(
          buildSubscription({ stripeCustomerId: "cus_new" }),
        ),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const paymentGateway = buildFakePaymentGateway({
      createCustomer: jest.fn().mockResolvedValue({ customerId: "cus_new" }),
      createCheckoutSession: jest
        .fn()
        .mockResolvedValue({ url: "https://checkout.stripe.com/2", sessionId: "cs_2" }),
    });
    const orgRepo = buildFakeOrgRepo({
      findByIdAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });

    const useCase = new CreateCheckoutSessionUseCase(
      subscriptionRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      paymentGateway,
      orgRepo,
      memberRepo,
      buildConfig(),
    );

    const result = await useCase.execute("org-1", "auth-1");

    expect(paymentGateway.createCustomer).toHaveBeenCalledWith({
      orgId: "org-1",
      email: "owner@example.com",
      name: "Studio Exemplo",
    });
    expect(subscriptionRepo.update).toHaveBeenCalledWith("org-1", {
      stripeCustomerId: "cus_new",
    });
    expect(paymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_new" }),
    );
    expect(result).toEqual({ url: "https://checkout.stripe.com/2" });
  });

  it("throws PlanNotAvailableException when the plan is missing", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(buildSubscription()),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(null),
    });
    const orgRepo = buildFakeOrgRepo({
      findByIdAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });

    const useCase = new CreateCheckoutSessionUseCase(
      subscriptionRepo,
      billingPlanRepo,
      buildFakeBillingPlanPriceRepo(),
      buildFakePaymentGateway(),
      orgRepo,
      memberRepo,
      buildConfig(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      PlanNotAvailableException,
    );
  });

  it("throws PlanIntervalNotEnabledException when the resolved price has no Stripe price yet", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(buildSubscription()),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest
        .fn()
        .mockResolvedValue(buildPlanPrice({ stripePriceId: null })),
    });
    const orgRepo = buildFakeOrgRepo({
      findByIdAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });

    const useCase = new CreateCheckoutSessionUseCase(
      subscriptionRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakePaymentGateway(),
      orgRepo,
      memberRepo,
      buildConfig(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      PlanIntervalNotEnabledException,
    );
  });

  it("grants a trial and marks it consumed on the first checkout", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(
        buildSubscription({ stripeCustomerId: "cus_1", trialConsumed: false }),
      ),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const paymentGateway = buildFakePaymentGateway({
      createCheckoutSession: jest
        .fn()
        .mockResolvedValue({ url: "https://checkout.stripe.com/3", sessionId: "cs_3" }),
    });
    const orgRepo = buildFakeOrgRepo({
      findByIdAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });

    const useCase = new CreateCheckoutSessionUseCase(
      subscriptionRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      paymentGateway,
      orgRepo,
      memberRepo,
      buildConfig(),
    );

    await useCase.execute("org-1", "auth-1");

    expect(subscriptionRepo.update).toHaveBeenCalledWith("org-1", {
      trialConsumed: true,
    });
    expect(paymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        trialPeriodDays: 60,
        paymentMethodCollection: "always",
      }),
    );
  });

  it("does not grant a trial nor mark it consumed again once already consumed", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(
        buildSubscription({ stripeCustomerId: "cus_1", trialConsumed: true }),
      ),
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const paymentGateway = buildFakePaymentGateway({
      createCheckoutSession: jest
        .fn()
        .mockResolvedValue({ url: "https://checkout.stripe.com/4", sessionId: "cs_4" }),
    });
    const orgRepo = buildFakeOrgRepo({
      findByIdAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });

    const useCase = new CreateCheckoutSessionUseCase(
      subscriptionRepo,
      billingPlanRepo,
      billingPlanPriceRepo,
      paymentGateway,
      orgRepo,
      memberRepo,
      buildConfig(),
    );

    await useCase.execute("org-1", "auth-1");

    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(paymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_1", priceId: "price_1" }),
    );
    const callArgs = paymentGateway.createCheckoutSession.mock.calls[0][0];
    expect(callArgs.trialPeriodDays).toBeUndefined();
    expect(callArgs.paymentMethodCollection).toBeUndefined();
  });

  it("throws SubscriptionNotFoundException when the org has no subscription row", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });

    const useCase = new CreateCheckoutSessionUseCase(
      subscriptionRepo,
      buildFakeBillingPlanRepo(),
      buildFakeBillingPlanPriceRepo(),
      buildFakePaymentGateway(),
      buildFakeOrgRepo(),
      buildFakeMemberRepo(),
      buildConfig(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotFoundException,
    );
  });
});
