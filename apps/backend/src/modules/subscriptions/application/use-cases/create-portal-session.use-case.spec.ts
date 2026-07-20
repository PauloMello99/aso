import { ConfigService } from "@nestjs/config";
import { CreatePortalSessionUseCase } from "./create-portal-session.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { OrgEntity } from "../../../organizations/domain/org.entity";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";
import { SubscriptionNotStripeLinkedException } from "../../domain/exceptions/subscription-not-stripe-linked.exception";

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
    name: "Ink House",
    slug: "ink-house",
    logoUrl: null,
    role: "owner",
    permissions: [],
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
    createPrice: jest.fn(),
    constructWebhookEvent: jest.fn(),
    getSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    createCoupon: jest.fn(),
    applyCouponToSubscription: jest.fn(),
    removeSubscriptionDiscount: jest.fn(),
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

function buildConfig(): jest.Mocked<ConfigService> {
  return {
    getOrThrow: jest.fn().mockReturnValue("https://app.ink-ops.test"),
  } as unknown as jest.Mocked<ConfigService>;
}

describe("CreatePortalSessionUseCase", () => {
  it("creates a portal session for a Stripe-linked subscription", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(
        buildSubscription({
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: "sub_stripe_1",
        }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway({
      createPortalSession: jest
        .fn()
        .mockResolvedValue({ url: "https://billing.stripe.com/session/1" }),
    });
    const orgRepo = buildFakeOrgRepo({
      findByIdAndAuthId: jest.fn().mockResolvedValue(buildOrg()),
    });

    const useCase = new CreatePortalSessionUseCase(
      subscriptionRepo,
      paymentGateway,
      orgRepo,
      buildConfig(),
    );

    const result = await useCase.execute("org-1", "auth-1");

    expect(result).toEqual({ url: "https://billing.stripe.com/session/1" });
    expect(paymentGateway.createPortalSession).toHaveBeenCalledWith({
      customerId: "cus_1",
      returnUrl:
        "https://app.ink-ops.test/dashboard/org/ink-house/settings/subscription",
    });
  });

  it("throws SubscriptionNotFoundException when the org has no subscription row", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });

    const useCase = new CreatePortalSessionUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeOrgRepo(),
      buildConfig(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotFoundException,
    );
  });

  it("throws SubscriptionNotStripeLinkedException when the subscription has no Stripe customer", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest
        .fn()
        .mockResolvedValue(buildSubscription({ stripeCustomerId: null })),
    });

    const useCase = new CreatePortalSessionUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeOrgRepo(),
      buildConfig(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotStripeLinkedException,
    );
  });

  it("throws SubscriptionNotStripeLinkedException when the customer exists but the Stripe subscription hasn't materialized yet", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(
        buildSubscription({
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: null,
        }),
      ),
    });

    const useCase = new CreatePortalSessionUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
      buildFakeOrgRepo(),
      buildConfig(),
    );

    await expect(useCase.execute("org-1", "auth-1")).rejects.toThrow(
      SubscriptionNotStripeLinkedException,
    );
  });
});
