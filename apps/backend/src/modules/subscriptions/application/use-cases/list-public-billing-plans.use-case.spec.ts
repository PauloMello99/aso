import { ListPublicBillingPlansUseCase } from "./list-public-billing-plans.use-case";
import type {
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import type {
  BillingPlanPriceEntity,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";

function makePlan(overrides: Partial<BillingPlanEntity> = {}): BillingPlanEntity {
  return {
    id: "plan-1",
    key: "pro",
    stripeProductId: "prod_123",
    stripePriceId: "price_123",
    name: "Pro",
    description: "Plano profissional",
    amountCents: 9900,
    currency: "brl",
    interval: "monthly",
    active: true,
    metadata: { internalTier: "gold" },
    lookupKey: "pro-monthly",
    productKey: "pro-product",
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makePrice(
  overrides: Partial<BillingPlanPriceEntity> = {},
): BillingPlanPriceEntity {
  return {
    id: "price-1",
    planId: "plan-1",
    interval: "monthly",
    amountCents: 9900,
    currency: "brl",
    stripePriceId: "price_123",
    lookupKey: "pro-monthly",
    active: true,
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("ListPublicBillingPlansUseCase", () => {
  function setup() {
    const billingPlanRepo: jest.Mocked<IBillingPlanRepository> = {
      findByKey: jest.fn(),
      findAll: jest.fn(),
      upsert: jest.fn(),
      findByStripeProductId: jest.fn(),
      findByStripePriceId: jest.fn(),
      updateByKey: jest.fn(),
    };
    const billingPlanPriceRepo: jest.Mocked<IBillingPlanPriceRepository> = {
      findActiveByPlanId: jest.fn(),
      findAllByPlanId: jest.fn(),
      findActiveByPlanIdAndInterval: jest.fn(),
      findByPlanIdAndInterval: jest.fn(),
      findByStripePriceId: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
      deactivateById: jest.fn(),
    };
    const useCase = new ListPublicBillingPlansUseCase(
      billingPlanRepo as unknown as IBillingPlanRepository,
      billingPlanPriceRepo as unknown as IBillingPlanPriceRepository,
    );
    return { useCase, billingPlanRepo, billingPlanPriceRepo };
  }

  it("não vaza campos internos do plano/preço no resultado público", async () => {
    const { useCase, billingPlanRepo, billingPlanPriceRepo } = setup();
    billingPlanRepo.findAll.mockResolvedValue([makePlan()]);
    billingPlanPriceRepo.findActiveByPlanId.mockResolvedValue([makePrice()]);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(Object.keys(result[0])).toEqual(
      expect.arrayContaining(["key", "name", "description", "prices"]),
    );
    expect(Object.keys(result[0])).not.toContain("id");
    expect(Object.keys(result[0])).not.toContain("stripeProductId");
    expect(Object.keys(result[0])).not.toContain("stripePriceId");
    expect(Object.keys(result[0])).not.toContain("lookupKey");
    expect(Object.keys(result[0])).not.toContain("productKey");
    expect(Object.keys(result[0])).not.toContain("metadata");
    expect(Object.keys(result[0])).not.toContain("lastSyncedAt");

    const priceKeys = Object.keys(result[0].prices[0]);
    expect(priceKeys).toEqual(
      expect.arrayContaining(["interval", "amountCents", "currency"]),
    );
    expect(priceKeys).not.toContain("id");
    expect(priceKeys).not.toContain("planId");
    expect(priceKeys).not.toContain("stripePriceId");
    expect(priceKeys).not.toContain("lookupKey");
    expect(priceKeys).not.toContain("active");
    expect(priceKeys).not.toContain("lastSyncedAt");
    expect(priceKeys).not.toContain("createdAt");
    expect(priceKeys).not.toContain("updatedAt");
  });

  it("omite plano inativo", async () => {
    const { useCase, billingPlanRepo, billingPlanPriceRepo } = setup();
    billingPlanRepo.findAll.mockResolvedValue([makePlan({ active: false })]);

    const result = await useCase.execute();

    expect(result).toHaveLength(0);
    expect(billingPlanPriceRepo.findActiveByPlanId).not.toHaveBeenCalled();
  });

  it("omite plano ativo sem nenhum preço ativo", async () => {
    const { useCase, billingPlanRepo, billingPlanPriceRepo } = setup();
    billingPlanRepo.findAll.mockResolvedValue([makePlan({ active: true })]);
    billingPlanPriceRepo.findActiveByPlanId.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toHaveLength(0);
  });

  it("retorna os 2 preços de um plano ativo com 2 preços ativos", async () => {
    const { useCase, billingPlanRepo, billingPlanPriceRepo } = setup();
    billingPlanRepo.findAll.mockResolvedValue([makePlan({ active: true })]);
    billingPlanPriceRepo.findActiveByPlanId.mockResolvedValue([
      makePrice({ id: "price-1", interval: "monthly", amountCents: 9900 }),
      makePrice({ id: "price-2", interval: "annual", amountCents: 99000 }),
    ]);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0].prices).toHaveLength(2);
    expect(result[0].prices).toEqual([
      { interval: "monthly", amountCents: 9900, currency: "brl" },
      { interval: "annual", amountCents: 99000, currency: "brl" },
    ]);
  });
});
