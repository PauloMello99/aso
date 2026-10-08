import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AppointmentConfirmationNotFoundException extends DomainException {
  readonly code = "APPOINTMENT_CONFIRMATION_NOT_FOUND";

  constructor() {
    super("Appointment confirmation link not found");
  }
}
