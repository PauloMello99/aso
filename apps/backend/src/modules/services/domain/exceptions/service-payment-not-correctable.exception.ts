import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServicePaymentNotCorrectableException extends DomainException {
  readonly code = "SERVICE_PAYMENT_NOT_CORRECTABLE";

  constructor(id: string) {
    super(`Service payment is not correctable (pending or reversed): ${id}`);
  }
}
