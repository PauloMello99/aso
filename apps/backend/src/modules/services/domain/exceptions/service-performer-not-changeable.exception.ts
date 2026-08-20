import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServicePerformerNotChangeableException extends DomainException {
  readonly code = "SERVICE_PERFORMER_NOT_CHANGEABLE";

  constructor(id: string) {
    super(
      `Cannot change performer of an already paid service: ${id} (commission was already calculated and recorded)`,
    );
  }
}
