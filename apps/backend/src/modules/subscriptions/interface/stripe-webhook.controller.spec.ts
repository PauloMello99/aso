import Stripe from "stripe";
import type { RawBodyRequest } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { HandleStripeWebhookUseCase } from "../application/use-cases/handle-stripe-webhook.use-case";
import { StripePaymentGateway } from "../infrastructure/stripe-payment-gateway";
import { ISubscriptionRepository } from "../domain/subscription.repository.interface";
import { IStripeWebhookEventRepository } from "../domain/stripe-webhook-event.repository.interface";
import { IBillingInvoiceEventRepository } from "../domain/billing-invoice-event.repository.interface";
import { IBillingPlanRepository } from "../domain/billing-plan.repository.interface";
import { IBillingCouponRepository } from "../domain/billing-coupon.repository.interface";
import { SubscriptionEntity } from "../domain/subscription.entity";
import { WebhookSignatureInvalidException } from "../domain/exceptions/webhook-signature-invalid.exception";
import { TelemetryService } from "../../../common/telemetry/telemetry.service";

/**
 * Exercises the full webhooks/stripe path (controller -> use-case ->
 * StripePaymentGateway.constructWebhookEvent) with a *real* Stripe SDK
 * signature verification, no network calls involved: payloads are signed
 * locally with `Stripe.webhooks.generateTestHeaderString` using a fixed
 * test secret, mirroring how Stripe itself signs webhook deliveries.
 *
 * `StripePaymentGateway.getSubscription` (the only method here that would
 * hit the real Stripe API) is stubbed via `jest.spyOn` on the instance;
 * repositories are fakes. This is the closest to an e2e test the current
 * harness supports — there is no supertest/HTTP e2e setup in this repo
 * (`test/` dir, `jest-e2e.json` and `supertest` are all absent from
 * package.json), so the request path is exercised by calling the
 * controller method directly rather than over real HTTP.
 */

const WEBHOOK_SECRET = "whsec_test_fixed_secret_for_e2e";

function buildConfig(): ConfigService {
  return {
    getOrThrow: jest.fn((key: string) => {
      if (key === "STRIPE_SECRET_KEY") return "sk_test_fake_key";
      if (key === "STRIPE_WEBHOOK_SECRET") return WEBHOOK_SECRET;
      throw new Error(`unexpected config key requested in test: ${key}`);
    }),
  } as unknown as ConfigService;
}

function signPayload(payload: string): string {
  return Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
}

function buildRawBodyRequest(payload: string): RawBodyRequest<Request> {
  return {
    rawBody: Buffer.from(payload),
  } as unknown as RawBodyRequest<Request>;
}

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
    findByStripeCustomerId: jest.fn(),
    findByStripeSubscriptionId: jest.fn(),
    findAllStripeLinked: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ISubscriptionRepository>;
}

function buildFakeWebhookEventRepo(
  overrides: Partial<jest.Mocked<IStripeWebhookEventRepository>> = {},
): jest.Mocked<IStripeWebhookEventRepository> {
  return {
    claim: jest.fn().mockResolvedValue(true),
    markProcessed: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStripeWebhookEventRepository>;
}

function buildFakeInvoiceEventRepo(): jest.Mocked<IBillingInvoiceEventRepository> {
  return {
    create: jest.fn(),
  } as unknown as jest.Mocked<IBillingInvoiceEventRepository>;
}

function buildFakeBillingPlanRepo(): jest.Mocked<IBillingPlanRepository> {
  return {
    findByKey: jest.fn(),
    findAll: jest.fn(),
    upsert: jest.fn(),
    findByStripeProductId: jest.fn().mockResolvedValue(null),
    findByStripePriceId: jest.fn().mockResolvedValue(null),
    updateByKey: jest.fn(),
  } as unknown as jest.Mocked<IBillingPlanRepository>;
}

function buildFakeBillingCouponRepo(): jest.Mocked<IBillingCouponRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByStripeCouponId: jest.fn().mockResolvedValue(null),
    findByStripePromotionCodeId: jest.fn(),
    findByCode: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    upsertFromStripe: jest.fn(),
  } as unknown as jest.Mocked<IBillingCouponRepository>;
}

function buildFakeTelemetry(): jest.Mocked<TelemetryService> {
  return {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    flush: jest.fn(),
  } as unknown as jest.Mocked<TelemetryService>;
}

describe("StripeWebhookController (webhooks/stripe, offline)", () => {
  it("rejects a payload signed with the wrong secret with WebhookSignatureInvalidException", async () => {
    const paymentGateway = new StripePaymentGateway(buildConfig());
    const webhookEventRepo = buildFakeWebhookEventRepo();
    const useCase = new HandleStripeWebhookUseCase(
      paymentGateway,
      buildFakeSubscriptionRepo(),
      webhookEventRepo,
      buildFakeInvoiceEventRepo(),
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeTelemetry(),
    );
    const controller = new StripeWebhookController(useCase);

    const payload = JSON.stringify({
      id: "evt_bad",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_stripe_1" } },
    });
    const badSignature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_completely_different_secret",
    });

    await expect(
      controller.handle(buildRawBodyRequest(payload), badSignature),
    ).rejects.toThrow(WebhookSignatureInvalidException);
    expect(webhookEventRepo.claim).not.toHaveBeenCalled();
  });

  it("processes a validly signed customer.subscription.updated event and returns {received:true}", async () => {
    const paymentGateway = new StripePaymentGateway(buildConfig());
    const normalized = {
      stripeSubscriptionId: "sub_stripe_1",
      stripeCustomerId: "cus_1",
      status: "active" as const,
      billingInterval: "monthly" as const,
      priceCents: 4990,
      stripePriceId: "price_1",
      stripeCouponId: null,
      discountPercent: null,
      trialEndsAt: null,
      currentPeriodStart: new Date("2026-02-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-03-01T00:00:00Z"),
      canceledAt: null,
      cancelAtPeriodEnd: false,
    };
    jest
      .spyOn(paymentGateway, "getSubscription")
      .mockResolvedValue(normalized);

    const current = buildSubscription();
    const subscriptionRepo = buildFakeSubscriptionRepo({
      findByStripeSubscriptionId: jest.fn().mockResolvedValue(current),
    });
    const webhookEventRepo = buildFakeWebhookEventRepo();
    const useCase = new HandleStripeWebhookUseCase(
      paymentGateway,
      subscriptionRepo,
      webhookEventRepo,
      buildFakeInvoiceEventRepo(),
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeTelemetry(),
    );
    const controller = new StripeWebhookController(useCase);

    const payload = JSON.stringify({
      id: "evt_good",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_stripe_1" } },
    });
    const signature = signPayload(payload);

    const result = await controller.handle(
      buildRawBodyRequest(payload),
      signature,
    );

    expect(result).toEqual({ received: true });
    expect(subscriptionRepo.update).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ status: "active", type: "standard" }),
    );
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith("evt_good");
  });

  it("does not reprocess a replayed event.id (claim returns false)", async () => {
    const paymentGateway = new StripePaymentGateway(buildConfig());
    const getSubscriptionSpy = jest.spyOn(paymentGateway, "getSubscription");

    const subscriptionRepo = buildFakeSubscriptionRepo();
    const webhookEventRepo = buildFakeWebhookEventRepo({
      claim: jest.fn().mockResolvedValue(false),
    });
    const useCase = new HandleStripeWebhookUseCase(
      paymentGateway,
      subscriptionRepo,
      webhookEventRepo,
      buildFakeInvoiceEventRepo(),
      buildFakeBillingPlanRepo(),
      buildFakeBillingCouponRepo(),
      buildFakeTelemetry(),
    );
    const controller = new StripeWebhookController(useCase);

    const payload = JSON.stringify({
      id: "evt_replay",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_stripe_1" } },
    });
    const signature = signPayload(payload);

    const result = await controller.handle(
      buildRawBodyRequest(payload),
      signature,
    );

    expect(result).toEqual({ received: true });
    expect(getSubscriptionSpy).not.toHaveBeenCalled();
    expect(subscriptionRepo.update).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
  });
});
