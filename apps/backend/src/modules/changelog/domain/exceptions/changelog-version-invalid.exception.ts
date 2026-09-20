import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ChangelogVersionInvalidException extends DomainException {
  readonly code = "CHANGELOG_VERSION_INVALID";

  constructor(version: number) {
    super(`Changelog version not found: ${version}`);
  }
}
