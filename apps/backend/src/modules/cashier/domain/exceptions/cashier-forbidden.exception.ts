import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Ação restrita a admins (owner/super_admin) — ex.: configurar taxas. */
export class CashierForbiddenException extends DomainException {
  readonly code = "CASHIER_FORBIDDEN";

  constructor(message = "You are not allowed to perform this action") {
    super(message);
  }
}
