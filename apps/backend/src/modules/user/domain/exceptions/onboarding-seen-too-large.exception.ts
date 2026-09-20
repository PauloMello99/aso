import { DomainException } from "../../../../common/exceptions/domain.exception";

export class OnboardingSeenTooLargeException extends DomainException {
  readonly code = "ONBOARDING_SEEN_TOO_LARGE";

  constructor() {
    super("O histórico de tours vistos excedeu o tamanho máximo permitido.");
  }
}
