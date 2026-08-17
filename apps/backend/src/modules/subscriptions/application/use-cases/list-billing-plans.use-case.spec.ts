import { ListBillingPlansUseCase } from "./list-billing-plans.use-case";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  BillingPlanPriceEntity,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";

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
    findByStripePriceId: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deactivateById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IBillingPlanPriceRepository>;
}

function buildPlan(overrides: Partial<BillingPlanEntity> = {}): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "standard",
    stripeProductId: "prod_1",
    stripePriceId: "price_1",
    name: "Padrão",
    description: null,
    amountCents: 40000,
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

function buildPrice(
  overrides: Partial<BillingPlanPriceEntity> = {},
): BillingPlanPriceEntity {
  return {
    id: "price-1",
    planId: "plan-1",
    interval: "monthly",
    amountCents: 40000,
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

describe("ListBillingPlansUseCase", () => {
  it("returns a plan with no prices with legacy fields as null/0 and empty prices", async () => {
    const plan = buildPlan();
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findAllByPlanId: jest.fn().mockResolvedValue([]),
    });

    const useCase = new ListBillingPlansUseCase(
      billingPlanRepo,
      billingPlanPriceRepo,
    );
    const result = await useCase.execute();

    expect(billingPlanPriceRepo.findAllByPlanId).toHaveBeenCalledWith(
      plan.id,
    );
    expect(result).toEqual([
      {
        ...plan,
        prices: [],
        amountCents: 0,
        currency: null,
        interval: null,
        stripePriceId: null,
      },
    ]);
  });

  it("returns all prices for a plan with 3 intervals and derives legacy fields from monthly", async () => {
    const plan = buildPlan();
    const monthly = buildPrice({
      id: "price-monthly",
      interval: "monthly",
      amountCents: 10000,
      stripePriceId: "price_monthly",
    });
    const semiannual = buildPrice({
      id: "price-semiannual",
      interval: "semiannual",
      amountCents: 55000,
      stripePriceId: "price_semiannual",
    });
    const annual = buildPrice({
      id: "price-annual",
      interval: "annual",
      amountCents: 100000,
      stripePriceId: "price_annual",
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findAllByPlanId: jest
        .fn()
        .mockResolvedValue([annual, monthly, semiannual]),
    });

    const useCase = new ListBillingPlansUseCase(
      billingPlanRepo,
      billingPlanPriceRepo,
    );
    const result = await useCase.execute();

    expect(result[0].prices).toEqual([monthly, semiannual, annual]);
    expect(result[0].amountCents).toBe(monthly.amountCents);
    expect(result[0].currency).toBe(monthly.currency);
    expect(result[0].interval).toBe("monthly");
    expect(result[0].stripePriceId).toBe(monthly.stripePriceId);
  });

  it("derives legacy fields from the active semiannual price when no monthly price exists", async () => {
    const plan = buildPlan();
    const semiannual = buildPrice({
      id: "price-semiannual",
      interval: "semiannual",
      amountCents: 55000,
      stripePriceId: "price_semiannual",
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findAllByPlanId: jest.fn().mockResolvedValue([semiannual]),
    });

    const useCase = new ListBillingPlansUseCase(
      billingPlanRepo,
      billingPlanPriceRepo,
    );
    const result = await useCase.execute();

    expect(result[0].prices).toEqual([semiannual]);
    expect(result[0].amountCents).toBe(semiannual.amountCents);
    expect(result[0].currency).toBe(semiannual.currency);
    expect(result[0].interval).toBe("semiannual");
    expect(result[0].stripePriceId).toBe(semiannual.stripePriceId);
  });

  it("ignores inactive prices when deriving legacy fields but still returns them in prices", async () => {
    const plan = buildPlan();
    const inactiveMonthly = buildPrice({
      id: "price-monthly-old",
      interval: "monthly",
      amountCents: 9000,
      active: false,
      stripePriceId: "price_monthly_old",
    });
    const activeAnnual = buildPrice({
      id: "price-annual",
      interval: "annual",
      amountCents: 100000,
      active: true,
      stripePriceId: "price_annual",
    });
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue([plan]),
    });
    const billingPlanPriceRepo = buildFakeBillingPlanPriceRepo({
      findAllByPlanId: jest
        .fn()
        .mockResolvedValue([inactiveMonthly, activeAnnual]),
    });

    const useCase = new ListBillingPlansUseCase(
      billingPlanRepo,
      billingPlanPriceRepo,
    );
    const result = await useCase.execute();

    expect(result[0].prices).toEqual([inactiveMonthly, activeAnnual]);
    expect(result[0].amountCents).toBe(activeAnnual.amountCents);
    expect(result[0].interval).toBe("annual");
  });
});
