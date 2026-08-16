import { Inject, Injectable } from "@nestjs/common";
import {
  BILLING_PLAN_REPOSITORY,
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";

@Injectable()
export class ListBillingPlansUseCase {
  constructor(
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
  ) {}

  async execute(): Promise<BillingPlanEntity[]> {
    return this.billingPlanRepo.findAll();
  }
}
