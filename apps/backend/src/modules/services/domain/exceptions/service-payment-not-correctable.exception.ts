import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Serviço pendente de pagamento ou com pagamento já estornado — não aceita correção de valor. */
export class ServicePaymentNotCorrectableException extends DomainException {
  readonly code = "SERVICE_PAYMENT_NOT_CORRECTABLE";

  constructor(id: string) {
    super(`Service payment is not correctable (pending or reversed): ${id}`);
  }
}
