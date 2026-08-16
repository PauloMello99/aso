import { Inject, Injectable } from "@nestjs/common";
import {
  IBillingCouponRepository,
  BILLING_COUPON_REPOSITORY,
  BillingCouponEntity,
} from "../../domain/billing-coupon.repository.interface";

@Injectable()
export class ListBillingCouponsUseCase {
  constructor(
    @Inject(BILLING_COUPON_REPOSITORY)
    private readonly billingCouponRepo: IBillingCouponRepository,
  ) {}

  async execute(filters?: {
    active?: boolean;
  }): Promise<BillingCouponEntity[]> {
    return this.billingCouponRepo.findAll(filters);
  }
}
