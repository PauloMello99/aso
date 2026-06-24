import { DomainException } from "../../../../common/exceptions/domain.exception";

export class OwnsOrganizationException extends DomainException {
  readonly code = "OWNS_ORGANIZATION";

  constructor() {
    super(
      "Transfira ou exclua as organizações das quais você é proprietário antes de excluir a conta",
    );
  }
}
