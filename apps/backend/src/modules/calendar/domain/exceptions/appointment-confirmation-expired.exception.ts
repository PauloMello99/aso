import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AppointmentConfirmationExpiredException extends DomainException {
  readonly code = "APPOINTMENT_CONFIRMATION_EXPIRED";

  constructor() {
    super("Appointment confirmation link expired");
  }
}
