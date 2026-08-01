import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CustomerAttachmentNotFoundException extends DomainException {
  readonly code = "CUSTOMER_ATTACHMENT_NOT_FOUND";

  constructor(id: string) {
    super(`Customer attachment not found: ${id}`);
  }
}
