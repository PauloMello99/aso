import { SetPlanIntervalActiveUseCase } from "./set-plan-interval-active.use-case";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  BillingPlanPriceEntity,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { BillingPlanNotFoundException } from "../../domain/exceptions/billing-plan-not-found.exception";
import { InvalidBillingPlanUpdateException } from "../../domain/exceptions/invalid-billing-plan-update.exception";
import { PlanIntervalNotEnabledException } from "../../domain/exceptions/plan-interval-not-enabled.exception";
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";

function buildPlan(overrides: Partial<BillingPlanEntity> = {}): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "standard",
    stripeProductId: "prod_1",
    stripePriceId: "price_old",
    name: "Standard",
    description: "Plano padrão",
    amountCents: 4990,
    currency: "brl",
    interval: "monthly",
    active: true,
    metadata: {},
    lookupKey: "standard",
    productKey: "standard",
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildPrice(
  overrides: Partial<BillingPlanPriceEntity> = {},
): BillingPlanPriceEntity {
  return {
    id: "price-row-1",
    planId: "plan-1",
    interval: "annual",
    amountCents: 49900,
    currency: "brl",
    stripePriceId: "price_annual",
    lookupKey: "standard-annual",
    active: false,
    lastSyncedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
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

function buildFakeBillingPlanPriceRepo(
  overrides: Partial<jest.Mocked<IBillingPlanPriceRepository>> = {},
): jest.Mocked<IBillingPlanPriceRepository> {
  return {
    findActiveByPlanId: jest.fn(),
    findAllByPlanId: jest.fn(),
    findActiveByPlanIdAndInterval: jest.fn(),
    findByPlanIdAndInterval: jest.fn(),
    findByStripePriceId: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deactivateById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanPriceRepository>;
}

function buildFakeAuditService(): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
}

function buildFakeRevalidationClient(): jest.Mocked<FrontendRevalidationClient> {
  return {
    revalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<FrontendRevalidationClient>;
}

describe("SetPlanIntervalActiveUseCase", () => {
  it("throws BillingPlanNotFoundException when the plan doesn't exist", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(null),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo();
    const useCase = new SetPlanIntervalActiveUseCase(
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeRevalidationClient(),
    );

    await expect(
      useCase.execute("missing-plan", "annual", true, "auth-1"),
    ).rejects.toThrow(BillingPlanNotFoundException);
    expect(billingPlanPriceRepo.updateById).not.toHaveBeenCalled();
  });

  it("throws PlanIntervalNotEnabledException when there is no price row at all for (plan, interval)", async () => {
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(buildPlan()),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
      findByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
    });
    const useCase = new SetPlanIntervalActiveUseCase(
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeRevalidationClient(),
    );

    await expect(
      useCase.execute("standard", "annual", true, "auth-1"),
    ).rejects.toThrow(PlanIntervalNotEnabledException);
    expect(billingPlanPriceRepo.updateById).not.toHaveBeenCalled();
  });

  it("enables an existing (inactive) interval price row", async () => {
    const plan = buildPlan();
    const price = buildPrice({ active: false });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const updatedPrice = { ...price, active: true };
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(null),
      findByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      updateById: jest.fn().mockResolvedValue(updatedPrice),
    });
    const auditService = buildFakeAuditService();
    const revalidationClient = buildFakeRevalidationClient();

    const useCase = new SetPlanIntervalActiveUseCase(
      billingPlanRepo,
      billingPlanPriceRepo,
      auditService,
      revalidationClient,
    );

    const result = await useCase.execute(
      "standard",
      "annual",
      true,
      "auth-1",
    );

    expect(revalidationClient.revalidate).toHaveBeenCalledWith("/");
    expect(billingPlanPriceRepo.findActiveByPlanId).not.toHaveBeenCalled();
    expect(billingPlanPriceRepo.updateById).toHaveBeenCalledWith(
      price.id,
      { active: true },
    );
    expect(auditService.logByAuthId).toHaveBeenCalledWith(
      "auth-1",
      expect.objectContaining({
        action: "subscription_changed",
        entityType: "billing_plan_price",
        entityId: updatedPrice.id,
        metadata: expect.objectContaining({
          operation: "toggle_interval_price",
          planKey: "standard",
          interval: "annual",
          active: true,
        }),
      }),
    );
    expect(result).toEqual(updatedPrice);
  });

  it("disables an active interval when it's not the plan's only active interval", async () => {
    const plan = buildPlan();
    const price = buildPrice({ id: "price-annual", active: true });
    const monthlyPrice = buildPrice({
      id: "price-monthly",
      interval: "monthly",
      active: true,
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      findByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      findActiveByPlanId: jest
        .fn()
        .mockResolvedValue([price, monthlyPrice]),
      updateById: jest
        .fn()
        .mockResolvedValue({ ...price, active: false }),
    });

    const useCase = new SetPlanIntervalActiveUseCase(
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeRevalidationClient(),
    );

    const result = await useCase.execute(
      "standard",
      "annual",
      false,
      "auth-1",
    );

    expect(billingPlanPriceRepo.updateById).toHaveBeenCalledWith(
      price.id,
      { active: false },
    );
    expect(result.active).toBe(false);
  });

  it("rejects disabling the plan's last active interval", async () => {
    const plan = buildPlan();
    const price = buildPrice({ id: "price-annual", active: true });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findByKey: jest.fn().mockResolvedValue(plan),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findActiveByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      findByPlanIdAndInterval: jest.fn().mockResolvedValue(price),
      findActiveByPlanId: jest.fn().mockResolvedValue([price]),
    });

    const useCase = new SetPlanIntervalActiveUseCase(
      billingPlanRepo,
      billingPlanPriceRepo,
      buildFakeAuditService(),
      buildFakeRevalidationClient(),
    );

    await expect(
      useCase.execute("standard", "annual", false, "auth-1"),
    ).rejects.toThrow(InvalidBillingPlanUpdateException);
    expect(billingPlanPriceRepo.updateById).not.toHaveBeenCalled();
  });
});
