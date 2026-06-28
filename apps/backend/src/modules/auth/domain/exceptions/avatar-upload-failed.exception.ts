import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AvatarUploadFailedException extends DomainException {
  readonly code = "AVATAR_UPLOAD_FAILED";

  constructor(message = "Failed to upload avatar") {
    super(message);
  }
}
