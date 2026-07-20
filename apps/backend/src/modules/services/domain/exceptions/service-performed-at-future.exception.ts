import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServicePerformedAtFutureException extends DomainException {
  readonly code = "SERVICE_PERFORMED_AT_FUTURE";

  constructor() {
    super("A data de execução não pode estar no futuro.");
  }
}
