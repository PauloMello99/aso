import { Inject, Injectable } from "@nestjs/common";
import {
  BILLING_PLAN_REPOSITORY,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  BILLING_PLAN_PRICE_REPOSITORY,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";
import type { BillingInterval } from "../../domain/subscription.entity";

export interface PublicBillingPlanPrice {
  interval: BillingInterval;
  amountCents: number;
  currency: string;
}

export interface PublicBillingPlan {
  key: string;
  name: string;
  description: string | null;
  prices: PublicBillingPlanPrice[];
}

@Injectable()
export class ListPublicBillingPlansUseCase {
  constructor(
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(BILLING_PLAN_PRICE_REPOSITORY)
    private readonly billingPlanPriceRepo: IBillingPlanPriceRepository,
  ) {}

  async execute(): Promise<PublicBillingPlan[]> {
    const plans = await this.billingPlanRepo.findAll();
    const activePlans = plans.filter((plan) => plan.active);

    const publicPlans = await Promise.all(
      activePlans.map(async (plan): Promise<PublicBillingPlan | null> => {
        const activePrices = await this.billingPlanPriceRepo.findActiveByPlanId(
          plan.id,
        );
        if (activePrices.length === 0) {
          return null;
        }

        return {
          key: plan.key,
          name: plan.name,
          description: plan.description,
          prices: activePrices.map((price) => ({
            interval: price.interval,
            amountCents: price.amountCents,
            currency: price.currency,
          })),
        };
      }),
    );

    return publicPlans.filter(
      (plan): plan is PublicBillingPlan => plan !== null,
    );
  }
}
