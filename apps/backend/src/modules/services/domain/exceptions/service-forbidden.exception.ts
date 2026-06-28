import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Ação restrita (ex.: funcionário tentando lançar/alterar em nome de outro). */
export class ServiceForbiddenException extends DomainException {
  readonly code = "SERVICE_FORBIDDEN";

  constructor(message = "You are not allowed to perform this action") {
    super(message);
  }
}
