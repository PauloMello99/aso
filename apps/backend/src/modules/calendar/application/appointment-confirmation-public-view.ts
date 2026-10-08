import type { AppointmentConfirmationView } from "../domain/appointment-confirmation.repository.interface";
import type { CalendarEventConfirmationStatus } from "../domain/calendar-event.entity";
import { AppointmentConfirmationNotFoundException } from "../domain/exceptions/appointment-confirmation-not-found.exception";

export type AppointmentConfirmationState = "open" | "event_canceled";

// Único formato exposto na rota pública: sem título, e-mail, ids, hash nem
// nomes de profissional/cliente.
export interface AppointmentConfirmationPublicView {
  orgName: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  confirmationStatus: CalendarEventConfirmationStatus;
  state: AppointmentConfirmationState;
}

export function toAppointmentConfirmationPublicView(
  view: AppointmentConfirmationView,
): AppointmentConfirmationPublicView {
  const { event } = view;
  // Evento encontrado por hash sempre tem ciclo (CHECK da 0086); a guarda só
  // estreita o tipo.
  if (event.confirmationStatus === null) {
    throw new AppointmentConfirmationNotFoundException();
  }
  return {
    orgName: view.orgName,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    confirmationStatus: event.confirmationStatus,
    state: event.status === "canceled" ? "event_canceled" : "open",
  };
}
