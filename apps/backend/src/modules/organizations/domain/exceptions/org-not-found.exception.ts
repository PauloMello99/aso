import { DomainException } from "../../../../common/exceptions/domain.exception";

export class OrgNotFoundException extends DomainException {
  readonly code = "ORGANIZATION_NOT_FOUND";

  constructor(orgId: string) {
    super(`Organization not found: ${orgId}`);
  }
}
