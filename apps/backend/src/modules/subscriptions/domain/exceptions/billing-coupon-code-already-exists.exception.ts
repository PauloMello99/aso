import { DomainException } from "../../../../common/exceptions/domain.exception";

export class BillingCouponCodeAlreadyExistsException extends DomainException {
  readonly code = "BILLING_COUPON_CODE_ALREADY_EXISTS";

  constructor() {
    super("Já existe um cupom com esse código");
  }
}
