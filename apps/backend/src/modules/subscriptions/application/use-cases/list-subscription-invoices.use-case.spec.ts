import { ListSubscriptionInvoicesUseCase } from "./list-subscription-invoices.use-case";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
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

describe("ListSubscriptionInvoicesUseCase", () => {
  it("throws SubscriptionNotFoundException when there is no subscription row", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });

    const useCase = new ListSubscriptionInvoicesUseCase(
      subscriptionRepo,
      buildFakePaymentGateway(),
    );

    await expect(useCase.execute("org-1")).rejects.toThrow(
      SubscriptionNotFoundException,
    );
  });

  it("returns an empty array when the subscription has no Stripe customer yet", async () => {
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(
        buildSubscription({ stripeCustomerId: null }),
      ),
    });
    const paymentGateway = buildFakePaymentGateway();

    const useCase = new ListSubscriptionInvoicesUseCase(
      subscriptionRepo,
      paymentGateway,
    );

    const result = await useCase.execute("org-1");

    expect(result).toEqual([]);
    expect(paymentGateway.listInvoices).not.toHaveBeenCalled();
  });

  it("delegates to the payment gateway when a Stripe customer exists", async () => {
    const subscription = buildSubscription();
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByOrgId: jest.fn().mockResolvedValue(subscription),
    });
    const invoices = [
      {
        stripeInvoiceId: "in_1",
        type: "paid" as const,
        amountCents: 4990,
        currency: "brl",
        occurredAt: new Date("2026-01-01T00:00:00Z"),
      },
    ];
    const paymentGateway = buildFakePaymentGateway({
      listInvoices: jest.fn().mockResolvedValue(invoices),
    });

    const useCase = new ListSubscriptionInvoicesUseCase(
      subscriptionRepo,
      paymentGateway,
    );

    const result = await useCase.execute("org-1");

    expect(paymentGateway.listInvoices).toHaveBeenCalledWith("cus_1");
    expect(result).toBe(invoices);
  });
});
