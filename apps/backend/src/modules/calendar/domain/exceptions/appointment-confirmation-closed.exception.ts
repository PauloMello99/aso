import { DomainException } from "../../../../common/exceptions/domain.exception";

export class AppointmentConfirmationClosedException extends DomainException {
  readonly code = "APPOINTMENT_CONFIRMATION_CLOSED";

  constructor() {
    super("Appointment is no longer open for confirmation");
  }
}
