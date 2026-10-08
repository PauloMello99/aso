import type { CalendarEventEntity } from "./calendar-event.entity";

export const APPOINTMENT_CONFIRMATION_REPOSITORY = Symbol(
  "APPOINTMENT_CONFIRMATION_REPOSITORY",
);

export type AppointmentConfirmationResponse = "confirmed" | "canceled_by_customer";

export interface DueCustomerReminder {
  event: CalendarEventEntity;
  orgName: string;
  // Snapshot do ciclo lido (confirmation_requested_at): chave do claim.
  requestedAt: Date;
}

export interface AppointmentConfirmationView {
  event: CalendarEventEntity;
  orgName: string;
}

// Acesso sem sessão (página pública do cliente e cron): a implementação usa a
// conexão administrativa e SEMPRE filtra pelo hash do token / pelo id do evento.
export interface IAppointmentConfirmationRepository {
  findDueCustomerReminders(
    now: Date,
    until: Date,
    limit: number,
  ): Promise<DueCustomerReminder[]>;

  // Reserva atomicamente o lembrete (customer_reminder_sent_at IS NULL -> now).
  // `now` vira o carimbo da reserva (claimedAt) e é a chave do compare-and-swap
  // de storeReminderToken/releaseCustomerReminder. Retorna false se outro
  // worker já reservou, o ciclo não está pendente, o evento foi cancelado,
  // já começou, saiu da janela (`until`) ou o ciclo mudou desde o findDue
  // (confirmation_requested_at != expectedRequestedAt, ex.: reagendamento).
  claimCustomerReminder(
    id: string,
    now: Date,
    until: Date,
    expectedRequestedAt: Date,
  ): Promise<boolean>;

  // Compare-and-swap: troca o hash vigente pelo do token do lembrete e carimba
  // o envio SÓ se a reserva ainda é a nossa (customer_reminder_sent_at =
  // claimedAt) e o ciclo segue pendente. false => o evento foi reagendado ou
  // respondido entre o claim e o envio (o hash enviado não vale).
  storeReminderToken(
    id: string,
    tokenHash: string,
    claimedAt: Date,
    sentAt: Date,
  ): Promise<boolean>;

  // Devolve a reserva (customer_reminder_sent_at = NULL) se ainda for a nossa,
  // para o próximo tick tentar de novo quando o envio falhou.
  releaseCustomerReminder(id: string, claimedAt: Date): Promise<void>;

  // Carimba confirmation_sent_at do e-mail de confirmação, só se o hash vigente
  // ainda é o do token enviado (reagendamento/troca de e-mail nesse meio-tempo
  // invalida o carimbo).
  markConfirmationSentByHash(
    eventId: string,
    tokenHash: string,
    sentAt: Date,
  ): Promise<void>;

  findByTokenHash(tokenHash: string): Promise<AppointmentConfirmationView | null>;

  // Grava a resposta só se o hash ainda é o vigente, o evento está agendado e
  // não começou. Retorna false caso contrário. A resposta é mutável.
  recordResponse(
    eventId: string,
    tokenHash: string,
    response: AppointmentConfirmationResponse,
    now: Date,
  ): Promise<boolean>;
}
