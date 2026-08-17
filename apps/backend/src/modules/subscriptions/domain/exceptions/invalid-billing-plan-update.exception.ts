import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InvalidBillingPlanUpdateException extends DomainException {
  readonly code = "INVALID_BILLING_PLAN_UPDATE";

  constructor(
    message = "amountCents não pode ser alterado via este endpoint; use a rotação de preço",
  ) {
    super(message);
  }
}
