import { ReconcileRefundsUseCase } from "./reconcile-refunds.use-case";
import { ICronJobStateRepository } from "../../../../common/cron/cron-job-state.repository.interface";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";
import {
  GatewayRefund,
  IPaymentGateway,
} from "../../domain/ports/payment-gateway.port";
import {
  BillingRefundEventStatus,
  IBillingRefundEventRepository,
} from "../../domain/billing-refund-event.repository.interface";
import { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import { SubscriptionEntity } from "../../domain/subscription.entity";
import { RefundOrgResolver } from "../refund-org-resolver.service";

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

function buildGatewayRefund(
  overrides: Partial<GatewayRefund> = {},
): GatewayRefund {
  return {
    refundId: "re_1",
    chargeId: "ch_1",
    status: "succeeded",
    amountCents: 500,
    currency: "brl",
    reason: "requested_by_customer",
    createdAt: new Date("2026-08-20T00:00:00Z"),
    ...overrides,
  };
}

function buildCronJobStateRepo(
  overrides: Partial<jest.Mocked<ICronJobStateRepository>> = {},
): jest.Mocked<ICronJobStateRepository> {
  return {
    claimRun: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as jest.Mocked<ICronJobStateRepository>;
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
    listRefundsByCharge: jest
      .fn()
      .mockResolvedValue({ refunds: [], truncated: false }),
    listRefundsCreatedSince: jest
      .fn()
      .mockResolvedValue({ refunds: [], truncated: false }),
    retrieveChargeCustomerId: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as jest.Mocked<IPaymentGateway>;
}

function buildFakeRefundEventRepo(
  overrides: Partial<jest.Mocked<IBillingRefundEventRepository>> = {},
): jest.Mocked<IBillingRefundEventRepository> {
  return {
    create: jest.fn(),
    listPageByOrgId: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    findResolvedOrgIdByRefundId: jest.fn().mockResolvedValue(null),
    findResolvedOrgIdByChargeId: jest.fn().mockResolvedValue(null),
    listUnresolvedChargeIds: jest.fn().mockResolvedValue([]),
    findStatusesByRefundIds: jest
      .fn()
      .mockResolvedValue(new Map<string, BillingRefundEventStatus[]>()),
    resolveOrgIdWhereNull: jest.fn().mockResolvedValue(0),
    backfillOrgIdFromResolvedSiblings: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as jest.Mocked<IBillingRefundEventRepository>;
}

function buildFakeSubscriptionRepo(
  overrides: Partial<jest.Mocked<ISubscriptionRepository>> = {},
): jest.Mocked<ISubscriptionRepository> {
  return {
    findByOrgId: jest.fn(),
    findByStripeCustomerId: jest.fn().mockResolvedValue(null),
    findByStripeSubscriptionId: jest.fn(),
    findAllStripeLinked: jest.fn().mockResolvedValue([]),
    findExpiredComps: jest.fn(),
    findExpiredPastDue: jest.fn(),
    findMigratableByStripePriceId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISubscriptionRepository>;
}

function buildFakeRefundOrgResolver(
  resolvedOrgId: string | null = null,
): jest.Mocked<RefundOrgResolver> {
  return {
    resolve: jest.fn().mockResolvedValue(resolvedOrgId),
  } as unknown as jest.Mocked<RefundOrgResolver>;
}

function buildFakeTelemetry(): jest.Mocked<TelemetryService> {
  return {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    flush: jest.fn(),
  } as unknown as jest.Mocked<TelemetryService>;
}

describe("ReconcileRefundsUseCase", () => {
  it("skips without touching the gateway when the throttle claim fails", async () => {
    const cronJobStateRepo = buildCronJobStateRepo({
      claimRun: jest.fn().mockResolvedValue(false),
    });
    const gateway = buildFakePaymentGateway();
    const refundEventRepo = buildFakeRefundEventRepo();

    const useCase = new ReconcileRefundsUseCase(
      cronJobStateRepo,
      gateway,
      refundEventRepo,
      buildFakeSubscriptionRepo(),
      buildFakeRefundOrgResolver(),
      buildFakeTelemetry(),
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      skipped: true,
      scanned: 0,
      written: 0,
      siblingBackfilled: 0,
      orphansResolved: 0,
      errors: 0,
      skippedForeign: 0,
    });
    expect(gateway.listRefundsCreatedSince).not.toHaveBeenCalled();
    expect(refundEventRepo.findStatusesByRefundIds).not.toHaveBeenCalled();
  });

  it("mirrors a new status transition for a refund that already has a local row", async () => {
    const refund = buildGatewayRefund({ refundId: "re_1", status: "succeeded" });
    const gateway = buildFakePaymentGateway({
      listRefundsCreatedSince: jest
        .fn()
        .mockResolvedValue({ refunds: [refund], truncated: false }),
    });
    const refundEventRepo = buildFakeRefundEventRepo({
      findStatusesByRefundIds: jest
        .fn()
        .mockResolvedValue(
          new Map<string, BillingRefundEventStatus[]>([["re_1", ["pending"]]]),
        ),
    });
    const resolver = buildFakeRefundOrgResolver("org-1");
    const telemetry = buildFakeTelemetry();

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      gateway,
      refundEventRepo,
      buildFakeSubscriptionRepo(),
      resolver,
      telemetry,
    );

    const result = await useCase.execute();

    expect(refundEventRepo.create).toHaveBeenCalledTimes(1);
    expect(refundEventRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeRefundId: "re_1",
        stripeChargeId: "ch_1",
        orgId: "org-1",
        status: "succeeded",
        amountCents: 500,
        currency: "brl",
        reason: "requested_by_customer",
        occurredAt: refund.createdAt,
      }),
    );
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("billing_refund_events row"),
      "warn",
      expect.objectContaining({
        code: "BILLING_REFUND_RECONCILE_ROW_WRITTEN",
        stripeRefundId: "re_1",
        status: "succeeded",
        amountCents: 500,
        orgId: "org-1",
      }),
    );
    expect(result.written).toBe(1);
    expect(result.skippedForeign).toBe(0);
  });

  it("does nothing when the refund's status is already mirrored locally (and never resolves the org)", async () => {
    const refund = buildGatewayRefund({ refundId: "re_1", status: "succeeded" });
    const gateway = buildFakePaymentGateway({
      listRefundsCreatedSince: jest
        .fn()
        .mockResolvedValue({ refunds: [refund], truncated: false }),
    });
    const refundEventRepo = buildFakeRefundEventRepo({
      findStatusesByRefundIds: jest
        .fn()
        .mockResolvedValue(
          new Map<string, BillingRefundEventStatus[]>([
            ["re_1", ["pending", "succeeded"]],
          ]),
        ),
    });
    const resolver = buildFakeRefundOrgResolver();

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      gateway,
      refundEventRepo,
      buildFakeSubscriptionRepo(),
      resolver,
      buildFakeTelemetry(),
    );

    const result = await useCase.execute();

    expect(refundEventRepo.create).not.toHaveBeenCalled();
    expect(resolver.resolve).not.toHaveBeenCalled();
    expect(result.written).toBe(0);
  });

  it("does not mirror a refund with no local row whose org cannot be resolved (insertion guard, D3b), only counts it", async () => {
    const refund = buildGatewayRefund({
      refundId: "re_foreign",
      chargeId: "ch_foreign",
    });
    const gateway = buildFakePaymentGateway({
      listRefundsCreatedSince: jest
        .fn()
        .mockResolvedValue({ refunds: [refund], truncated: false }),
    });
    const refundEventRepo = buildFakeRefundEventRepo();
    const resolver = buildFakeRefundOrgResolver(null);
    const telemetry = buildFakeTelemetry();

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      gateway,
      refundEventRepo,
      buildFakeSubscriptionRepo(),
      resolver,
      telemetry,
    );

    const result = await useCase.execute();

    expect(refundEventRepo.create).not.toHaveBeenCalled();
    expect(result.skippedForeign).toBe(1);
    expect(result.written).toBe(0);
    expect(telemetry.captureMessage).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ code: "BILLING_REFUND_RECONCILE_ROW_WRITTEN" }),
    );
  });

  it("mirrors a refund with no local row when its org is resolvable", async () => {
    const refund = buildGatewayRefund({ refundId: "re_new", status: "pending" });
    const gateway = buildFakePaymentGateway({
      listRefundsCreatedSince: jest
        .fn()
        .mockResolvedValue({ refunds: [refund], truncated: false }),
    });
    const refundEventRepo = buildFakeRefundEventRepo();
    const resolver = buildFakeRefundOrgResolver("org-9");

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      gateway,
      refundEventRepo,
      buildFakeSubscriptionRepo(),
      resolver,
      buildFakeTelemetry(),
    );

    const result = await useCase.execute();

    expect(refundEventRepo.create).toHaveBeenCalledTimes(1);
    expect(refundEventRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeRefundId: "re_new",
        orgId: "org-9",
        status: "pending",
        occurredAt: refund.createdAt,
      }),
    );
    expect(result.written).toBe(1);
  });

  it("resolves the org once per charge within a run — two refunds of the same charge share a single resolve call", async () => {
    const refunds = [
      buildGatewayRefund({ refundId: "re_a", chargeId: "ch_shared" }),
      buildGatewayRefund({ refundId: "re_b", chargeId: "ch_shared" }),
    ];
    const gateway = buildFakePaymentGateway({
      listRefundsCreatedSince: jest
        .fn()
        .mockResolvedValue({ refunds, truncated: false }),
    });
    const refundEventRepo = buildFakeRefundEventRepo();
    const resolver = buildFakeRefundOrgResolver("org-5");

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      gateway,
      refundEventRepo,
      buildFakeSubscriptionRepo(),
      resolver,
      buildFakeTelemetry(),
    );

    const result = await useCase.execute();

    // The org-resolution ladder is memoized per charge for the span of the run:
    // the second refund of ch_shared reuses the first refund's resolved org
    // instead of triggering its own resolve (and its own charges.retrieve).
    expect(resolver.resolve).toHaveBeenCalledTimes(1);
    expect(resolver.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ refundId: "re_a", chargeId: "ch_shared" }),
    );
    expect(refundEventRepo.create).toHaveBeenCalledTimes(2);
    expect(refundEventRepo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ stripeRefundId: "re_a", orgId: "org-5" }),
    );
    expect(refundEventRepo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ stripeRefundId: "re_b", orgId: "org-5" }),
    );
    expect(result.written).toBe(2);
  });

  it("skips a refund whose Stripe status is outside the whitelist", async () => {
    const refund = buildGatewayRefund({
      refundId: "re_weird",
      status: "requires_capture",
    });
    const gateway = buildFakePaymentGateway({
      listRefundsCreatedSince: jest
        .fn()
        .mockResolvedValue({ refunds: [refund], truncated: false }),
    });
    const refundEventRepo = buildFakeRefundEventRepo();
    const resolver = buildFakeRefundOrgResolver("org-1");
    const telemetry = buildFakeTelemetry();

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      gateway,
      refundEventRepo,
      buildFakeSubscriptionRepo(),
      resolver,
      telemetry,
    );

    const result = await useCase.execute();

    expect(refundEventRepo.create).not.toHaveBeenCalled();
    expect(resolver.resolve).not.toHaveBeenCalled();
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.anything(),
      "warn",
      expect.objectContaining({
        code: "BILLING_REFUND_EVENT_UNKNOWN_STATUS",
        stripeRefundId: "re_weird",
      }),
    );
    expect(result.written).toBe(0);
  });

  it("keeps scanning the remaining refunds after one fails, and counts the error", async () => {
    const refunds = [
      buildGatewayRefund({ refundId: "re_a", chargeId: "ch_a" }),
      buildGatewayRefund({ refundId: "re_boom", chargeId: "ch_boom" }),
      buildGatewayRefund({ refundId: "re_c", chargeId: "ch_c" }),
    ];
    const gateway = buildFakePaymentGateway({
      listRefundsCreatedSince: jest
        .fn()
        .mockResolvedValue({ refunds, truncated: false }),
    });
    const refundEventRepo = buildFakeRefundEventRepo({
      // Call order follows refund order: re_a, re_boom, re_c.
      create: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("db down"))
        .mockResolvedValueOnce(undefined),
    });
    const resolver = buildFakeRefundOrgResolver("org-1");
    const telemetry = buildFakeTelemetry();

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      gateway,
      refundEventRepo,
      buildFakeSubscriptionRepo(),
      resolver,
      telemetry,
    );

    const result = await useCase.execute();

    expect(refundEventRepo.create).toHaveBeenCalledTimes(3);
    expect(result.written).toBe(2);
    expect(result.errors).toBe(1);
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("re_boom"),
      "warn",
      expect.objectContaining({
        code: "BILLING_REFUND_RECONCILE_FAILED",
        stripeRefundId: "re_boom",
      }),
    );
  });

  it("re-resolves orphan rows in pass 2 and reports how many were backfilled", async () => {
    const gateway = buildFakePaymentGateway({
      retrieveChargeCustomerId: jest.fn().mockResolvedValue("cus_orphan"),
    });
    const refundEventRepo = buildFakeRefundEventRepo({
      listUnresolvedChargeIds: jest.fn().mockResolvedValue(["ch_orphan"]),
      resolveOrgIdWhereNull: jest.fn().mockResolvedValue(2),
    });
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByStripeCustomerId: jest
        .fn()
        .mockResolvedValue(buildSubscription({ orgId: "org-7" })),
    });
    const telemetry = buildFakeTelemetry();

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      gateway,
      refundEventRepo,
      subscriptionRepo,
      buildFakeRefundOrgResolver(),
      telemetry,
    );

    const result = await useCase.execute();

    expect(gateway.retrieveChargeCustomerId).toHaveBeenCalledWith("ch_orphan");
    expect(refundEventRepo.listUnresolvedChargeIds).toHaveBeenCalledWith(
      200,
      expect.any(Date),
    );
    expect(refundEventRepo.resolveOrgIdWhereNull).toHaveBeenCalledWith(
      "ch_orphan",
      "org-7",
    );
    expect(result.orphansResolved).toBe(2);
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.anything(),
      "warn",
      expect.objectContaining({
        code: "BILLING_REFUND_ORPHAN_RESOLVED",
        stripeChargeId: "ch_orphan",
        orgId: "org-7",
        rowsAffected: 2,
      }),
    );
  });

  it("backfills orphan rows from a resolved sibling at the start of pass 2 and reports the count", async () => {
    const refundEventRepo = buildFakeRefundEventRepo({
      backfillOrgIdFromResolvedSiblings: jest.fn().mockResolvedValue(3),
    });
    const telemetry = buildFakeTelemetry();

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      buildFakePaymentGateway(),
      refundEventRepo,
      buildFakeSubscriptionRepo(),
      buildFakeRefundOrgResolver(),
      telemetry,
    );

    const result = await useCase.execute();

    expect(
      refundEventRepo.backfillOrgIdFromResolvedSiblings,
    ).toHaveBeenCalledTimes(1);
    // Pass 2 starts with the sibling backfill, before scanning for orphans.
    const backfillOrder =
      refundEventRepo.backfillOrgIdFromResolvedSiblings.mock
        .invocationCallOrder[0];
    const listOrder =
      refundEventRepo.listUnresolvedChargeIds.mock.invocationCallOrder[0];
    expect(backfillOrder).toBeLessThan(listOrder);
    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.anything(),
      "warn",
      expect.objectContaining({
        code: "BILLING_REFUND_ORPHAN_SIBLING_BACKFILL",
        rowsAffected: 3,
      }),
    );
    expect(result.siblingBackfilled).toBe(3);
  });

  it("emits BILLING_REFUND_RECONCILE_SCAN_TRUNCATED when the global scan is truncated", async () => {
    const gateway = buildFakePaymentGateway({
      listRefundsCreatedSince: jest
        .fn()
        .mockResolvedValue({ refunds: [], truncated: true }),
    });
    const telemetry = buildFakeTelemetry();

    const useCase = new ReconcileRefundsUseCase(
      buildCronJobStateRepo(),
      gateway,
      buildFakeRefundEventRepo(),
      buildFakeSubscriptionRepo(),
      buildFakeRefundOrgResolver(),
      telemetry,
    );

    await useCase.execute();

    expect(telemetry.captureMessage).toHaveBeenCalledWith(
      expect.anything(),
      "warn",
      expect.objectContaining({
        code: "BILLING_REFUND_RECONCILE_SCAN_TRUNCATED",
      }),
    );
  });
});
