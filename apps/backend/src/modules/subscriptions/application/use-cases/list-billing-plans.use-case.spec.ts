import { ListBillingPlansUseCase } from "./list-billing-plans.use-case";
import {
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";

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

describe("ListBillingPlansUseCase", () => {
  it("returns every billing plan from the repository", async () => {
    const plans = [buildPlan()];
    const billingPlanRepo = buildFakeBillingPlanRepo({
      findAll: jest.fn().mockResolvedValue(plans),
    });

    const useCase = new ListBillingPlansUseCase(billingPlanRepo);
    const result = await useCase.execute();

    expect(billingPlanRepo.findAll).toHaveBeenCalled();
    expect(result).toBe(plans);
  });
});
