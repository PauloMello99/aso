import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CaptchaVerificationFailedException extends DomainException {
  readonly code = "CAPTCHA_VERIFICATION_FAILED";

  constructor() {
    super("Captcha verification failed");
  }
}
