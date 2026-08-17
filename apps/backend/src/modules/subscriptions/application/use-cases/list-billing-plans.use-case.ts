import { Inject, Injectable } from "@nestjs/common";
import {
  BILLING_PLAN_REPOSITORY,
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  BILLING_PLAN_PRICE_REPOSITORY,
  BillingPlanPriceEntity,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";
import type { BillingInterval } from "../../domain/subscription.entity";

const INTERVAL_ORDER: Record<BillingInterval, number> = {
  monthly: 0,
  semiannual: 1,
  annual: 2,
};

export interface BillingPlanWithPrices
  extends Omit<
    BillingPlanEntity,
    "amountCents" | "currency" | "interval" | "stripePriceId"
  > {
  prices: BillingPlanPriceEntity[];
  /** @deprecated - será removido quando o frontend migrar para múltiplos preços por intervalo */
  amountCents: number;
  /** @deprecated - será removido quando o frontend migrar para múltiplos preços por intervalo */
  currency: string | null;
  /** @deprecated - será removido quando o frontend migrar para múltiplos preços por intervalo */
  interval: string | null;
  /** @deprecated - será removido quando o frontend migrar para múltiplos preços por intervalo */
  stripePriceId: string | null;
}

function sortPrices(
  prices: BillingPlanPriceEntity[],
): BillingPlanPriceEntity[] {
  return [...prices].sort(
    (a, b) => INTERVAL_ORDER[a.interval] - INTERVAL_ORDER[b.interval],
  );
}

function pickLegacyPrice(
  prices: BillingPlanPriceEntity[],
): BillingPlanPriceEntity | null {
  const activePrices = prices.filter((price) => price.active);
  const monthly = activePrices.find((price) => price.interval === "monthly");
  return monthly ?? activePrices[0] ?? null;
}

@Injectable()
export class ListBillingPlansUseCase {
  constructor(
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(BILLING_PLAN_PRICE_REPOSITORY)
    private readonly billingPlanPriceRepo: IBillingPlanPriceRepository,
  ) {}

  async execute(): Promise<BillingPlanWithPrices[]> {
    const plans = await this.billingPlanRepo.findAll();

    return Promise.all(
      plans.map(async (plan) => {
        const prices = sortPrices(
          await this.billingPlanPriceRepo.findAllByPlanId(plan.id),
        );
        const legacyPrice = pickLegacyPrice(prices);

        return {
          ...plan,
          prices,
          amountCents: legacyPrice?.amountCents ?? 0,
          currency: legacyPrice?.currency ?? null,
          interval: legacyPrice?.interval ?? null,
          stripePriceId: legacyPrice?.stripePriceId ?? null,
        };
      }),
    );
  }
}
