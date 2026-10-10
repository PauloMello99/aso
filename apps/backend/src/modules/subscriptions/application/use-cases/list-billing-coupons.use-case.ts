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
    const coupons = await this.billingCouponRepo.findAll(filters);
    // Linhas sem promotion code (legado/espelho de cupom ad hoc) continuam no
    // banco, mas não são cupons gerenciáveis: não têm código nem como
    // desativar.
    return coupons.filter((coupon) => coupon.stripePromotionCodeId !== null);
  }
}
