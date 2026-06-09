import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SlugAlreadyTakenException extends DomainException {
  readonly code = "SLUG_ALREADY_TAKEN";

  constructor(slug: string) {
    super(`Slug already taken: ${slug}`);
  }
}
