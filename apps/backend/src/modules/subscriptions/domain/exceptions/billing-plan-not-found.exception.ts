import { DomainException } from "../../../../common/exceptions/domain.exception";

export class BillingPlanNotFoundException extends DomainException {
  readonly code = "BILLING_PLAN_NOT_FOUND";

  constructor(key?: string) {
    super(key ? `Billing plan not found: ${key}` : "Billing plan not found");
  }
}
