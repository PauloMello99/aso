import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InvalidCouponConfigException extends DomainException {
  readonly code = "INVALID_COUPON_CONFIG";

  constructor(message = "Configuração de cupom inválida") {
    super(message);
  }
}
