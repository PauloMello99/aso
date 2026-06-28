import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Serviço já pago ou cancelado — não aceita registro de pagamento. */
export class ServiceNotPayableException extends DomainException {
  readonly code = "SERVICE_NOT_PAYABLE";

  constructor(id: string) {
    super(`Service is not payable (already paid or canceled): ${id}`);
  }
}
