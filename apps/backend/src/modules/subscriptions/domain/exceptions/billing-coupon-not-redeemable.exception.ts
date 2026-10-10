import { DomainException } from "../../../../common/exceptions/domain.exception";

export class BillingCouponNotRedeemableException extends DomainException {
  readonly code = "BILLING_COUPON_NOT_REDEEMABLE";

  constructor() {
    super("Cupom esgotado, expirado ou removido no Stripe: não pode ser reativado");
  }
}
