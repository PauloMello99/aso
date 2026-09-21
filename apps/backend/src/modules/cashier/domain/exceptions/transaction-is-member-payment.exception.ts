import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TransactionIsMemberPaymentException extends DomainException {
  readonly code = "TRANSACTION_IS_MEMBER_PAYMENT";

  constructor(readonly transactionId: string) {
    super(
      "Este lançamento é um pagamento a membro. Estorne ou corrija pela tela do membro.",
    );
  }
}
