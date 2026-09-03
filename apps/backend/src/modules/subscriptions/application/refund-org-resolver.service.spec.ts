import { RefundOrgResolver } from "./refund-org-resolver.service";
import { ISubscriptionRepository } from "../domain/subscription.repository.interface";
import { IBillingRefundEventRepository } from "../domain/billing-refund-event.repository.interface";
import { IPaymentGateway } from "../domain/ports/payment-gateway.port";
import { SubscriptionEntity } from "../domain/subscription.entity";

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
    currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
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
    findByStripeCustomerId: jest.fn().mockResolvedValue(null),
    findByStripeSubscriptionId: jest.fn(),
    findAllStripeLinked: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISubscriptionRepository>;
}

function buildFakeRefundEventRepo(
  overrides: Partial<jest.Mocked<IBillingRefundEventRepository>> = {},
): jest.Mocked<IBillingRefundEventRepository> {
  return {
    create: jest.fn(),
    findResolvedOrgIdByRefundId: jest.fn().mockResolvedValue(null),
    findResolvedOrgIdByChargeId: jest.fn().mockResolvedValue(null),
    backfillOrgIdFromResolvedSiblings: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as jest.Mocked<IBillingRefundEventRepository>;
}

function buildFakePaymentGateway(
  overrides: Partial<jest.Mocked<IPaymentGateway>> = {},
): jest.Mocked<IPaymentGateway> {
  return {
    retrieveChargeCustomerId: jest.fn().mockResolvedValue(null),
    retrievePaymentIntentCustomerId: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as jest.Mocked<IPaymentGateway>;
}

function buildResolver(deps: {
  subscriptionRepo?: jest.Mocked<ISubscriptionRepository>;
  refundEventRepo?: jest.Mocked<IBillingRefundEventRepository>;
  paymentGateway?: jest.Mocked<IPaymentGateway>;
} = {}): {
  resolver: RefundOrgResolver;
  subscriptionRepo: jest.Mocked<ISubscriptionRepository>;
  refundEventRepo: jest.Mocked<IBillingRefundEventRepository>;
  paymentGateway: jest.Mocked<IPaymentGateway>;
} {
  const subscriptionRepo = deps.subscriptionRepo ?? buildFakeSubscriptionRepo();
  const refundEventRepo = deps.refundEventRepo ?? buildFakeRefundEventRepo();
  const paymentGateway = deps.paymentGateway ?? buildFakePaymentGateway();
  const resolver = new RefundOrgResolver(
    subscriptionRepo,
    refundEventRepo,
    paymentGateway,
  );
  return { resolver, subscriptionRepo, refundEventRepo, paymentGateway };
}

describe("RefundOrgResolver", () => {
  it("(a) resolves from the charge's customer and stops before any other lookup", async () => {
    const { resolver, subscriptionRepo, refundEventRepo, paymentGateway } =
      buildResolver({
        subscriptionRepo: buildFakeSubscriptionRepo({
          findByStripeCustomerId: jest
            .fn()
            .mockResolvedValue(buildSubscription({ orgId: "org-9" })),
        }),
      });

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: "ch_1",
      customerId: "cus_1",
    });

    expect(orgId).toBe("org-9");
    expect(subscriptionRepo.findByStripeCustomerId).toHaveBeenCalledTimes(1);
    expect(subscriptionRepo.findByStripeCustomerId).toHaveBeenCalledWith("cus_1");
    expect(refundEventRepo.findResolvedOrgIdByRefundId).not.toHaveBeenCalled();
    expect(refundEventRepo.findResolvedOrgIdByChargeId).not.toHaveBeenCalled();
    expect(paymentGateway.retrieveChargeCustomerId).not.toHaveBeenCalled();
  });

  it("(b) falls through to an org already mirrored for the refund id when there is no customer, and stops there", async () => {
    const { resolver, subscriptionRepo, refundEventRepo, paymentGateway } =
      buildResolver({
        refundEventRepo: buildFakeRefundEventRepo({
          findResolvedOrgIdByRefundId: jest.fn().mockResolvedValue("org-7"),
        }),
      });

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: "ch_1",
      customerId: null,
    });

    expect(orgId).toBe("org-7");
    expect(subscriptionRepo.findByStripeCustomerId).not.toHaveBeenCalled();
    expect(refundEventRepo.findResolvedOrgIdByRefundId).toHaveBeenCalledWith(
      "re_1",
    );
    expect(refundEventRepo.findResolvedOrgIdByChargeId).not.toHaveBeenCalled();
    expect(paymentGateway.retrieveChargeCustomerId).not.toHaveBeenCalled();
  });

  it("(c) falls through to an org already mirrored for the charge id, and stops before charges.retrieve", async () => {
    const { resolver, refundEventRepo, paymentGateway } = buildResolver({
      refundEventRepo: buildFakeRefundEventRepo({
        findResolvedOrgIdByChargeId: jest.fn().mockResolvedValue("org-5"),
      }),
    });

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: "ch_1",
      customerId: null,
    });

    expect(orgId).toBe("org-5");
    expect(refundEventRepo.findResolvedOrgIdByRefundId).toHaveBeenCalledWith(
      "re_1",
    );
    expect(refundEventRepo.findResolvedOrgIdByChargeId).toHaveBeenCalledWith(
      "ch_1",
    );
    expect(paymentGateway.retrieveChargeCustomerId).not.toHaveBeenCalled();
  });

  it("(d) resolves via charges.retrieve -> local subscription when nothing is mirrored", async () => {
    const { resolver, subscriptionRepo, paymentGateway } = buildResolver({
      subscriptionRepo: buildFakeSubscriptionRepo({
        findByStripeCustomerId: jest
          .fn()
          .mockResolvedValue(buildSubscription({ orgId: "org-3" })),
      }),
      paymentGateway: buildFakePaymentGateway({
        retrieveChargeCustomerId: jest.fn().mockResolvedValue("cus_5"),
      }),
    });

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: "ch_1",
      customerId: null,
    });

    expect(orgId).toBe("org-3");
    expect(paymentGateway.retrieveChargeCustomerId).toHaveBeenCalledTimes(1);
    expect(paymentGateway.retrieveChargeCustomerId).toHaveBeenCalledWith("ch_1");
    expect(subscriptionRepo.findByStripeCustomerId).toHaveBeenCalledWith("cus_5");
  });

  it("(d) swallows a charges.retrieve failure and returns null", async () => {
    const { resolver, paymentGateway } = buildResolver({
      paymentGateway: buildFakePaymentGateway({
        retrieveChargeCustomerId: jest
          .fn()
          .mockRejectedValue(new Error("stripe timeout")),
      }),
    });

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: "ch_1",
      customerId: null,
    });

    expect(orgId).toBeNull();
    expect(paymentGateway.retrieveChargeCustomerId).toHaveBeenCalledTimes(1);
  });

  it("returns null when every source comes up empty", async () => {
    const { resolver } = buildResolver({
      paymentGateway: buildFakePaymentGateway({
        retrieveChargeCustomerId: jest.fn().mockResolvedValue("cus_x"),
      }),
    });

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: "ch_1",
      customerId: "cus_1",
    });

    expect(orgId).toBeNull();
  });

  it("skips the charge-keyed steps (c) and (d) when chargeId is null", async () => {
    const { resolver, refundEventRepo, paymentGateway } = buildResolver();

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: null,
      customerId: null,
    });

    expect(orgId).toBeNull();
    expect(refundEventRepo.findResolvedOrgIdByRefundId).toHaveBeenCalledWith(
      "re_1",
    );
    expect(refundEventRepo.findResolvedOrgIdByChargeId).not.toHaveBeenCalled();
    expect(paymentGateway.retrieveChargeCustomerId).not.toHaveBeenCalled();
  });

  it("(e) resolves via paymentIntents.retrieve -> local subscription when the charge is null", async () => {
    const { resolver, subscriptionRepo, paymentGateway } = buildResolver({
      subscriptionRepo: buildFakeSubscriptionRepo({
        findByStripeCustomerId: jest
          .fn()
          .mockResolvedValue(buildSubscription({ orgId: "org-2" })),
      }),
      paymentGateway: buildFakePaymentGateway({
        retrievePaymentIntentCustomerId: jest.fn().mockResolvedValue("cus_x"),
      }),
    });

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: null,
      customerId: null,
      paymentIntentId: "pi_1",
    });

    expect(orgId).toBe("org-2");
    expect(paymentGateway.retrievePaymentIntentCustomerId).toHaveBeenCalledWith(
      "pi_1",
    );
    expect(subscriptionRepo.findByStripeCustomerId).toHaveBeenCalledWith("cus_x");
  });

  it("(e) is skipped when paymentIntentId is null", async () => {
    const { resolver, paymentGateway } = buildResolver();

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: null,
      customerId: null,
      paymentIntentId: null,
    });

    expect(orgId).toBeNull();
    expect(
      paymentGateway.retrievePaymentIntentCustomerId,
    ).not.toHaveBeenCalled();
  });

  it("(e) swallows a paymentIntents.retrieve failure and returns null", async () => {
    const { resolver, paymentGateway } = buildResolver({
      paymentGateway: buildFakePaymentGateway({
        retrievePaymentIntentCustomerId: jest
          .fn()
          .mockRejectedValue(new Error("stripe timeout")),
      }),
    });

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: null,
      customerId: null,
      paymentIntentId: "pi_1",
    });

    expect(orgId).toBeNull();
    expect(
      paymentGateway.retrievePaymentIntentCustomerId,
    ).toHaveBeenCalledTimes(1);
  });

  it("(e) is skipped when step (d) already yielded a customer", async () => {
    const { resolver, paymentGateway } = buildResolver({
      paymentGateway: buildFakePaymentGateway({
        retrieveChargeCustomerId: jest.fn().mockResolvedValue("cus_5"),
        retrievePaymentIntentCustomerId: jest.fn().mockResolvedValue("cus_x"),
      }),
    });

    const orgId = await resolver.resolve({
      refundId: "re_1",
      chargeId: "ch_1",
      customerId: null,
      paymentIntentId: "pi_1",
    });

    expect(orgId).toBeNull();
    expect(paymentGateway.retrieveChargeCustomerId).toHaveBeenCalledWith("ch_1");
    expect(
      paymentGateway.retrievePaymentIntentCustomerId,
    ).not.toHaveBeenCalled();
  });
});
