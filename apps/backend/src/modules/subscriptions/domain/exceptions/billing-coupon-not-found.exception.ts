import { DomainException } from "../../../../common/exceptions/domain.exception";

export class BillingCouponNotFoundException extends DomainException {
  readonly code = "BILLING_COUPON_NOT_FOUND";

  constructor(id?: string) {
    super(id ? `Billing coupon not found: ${id}` : "Billing coupon not found");
  }
}
