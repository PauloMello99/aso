import { Controller, Get, UseGuards } from "@nestjs/common";
import { ListPublicBillingPlansUseCase } from "../application/use-cases/list-public-billing-plans.use-case";
import type { PublicBillingPlan } from "../application/use-cases/list-public-billing-plans.use-case";
import { PublicBillingFeatureFlagGuard } from "./public-billing-feature-flag.guard";

@Controller("public/billing")
@UseGuards(PublicBillingFeatureFlagGuard)
export class PublicBillingController {
  constructor(
    private readonly listPublicBillingPlans: ListPublicBillingPlansUseCase,
  ) {}

  @Get("plans")
  async plans(): Promise<PublicBillingPlan[]> {
    return this.listPublicBillingPlans.execute();
  }
}
