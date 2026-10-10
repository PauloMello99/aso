import type {
  CalendarEventEntity,
  CalendarEventStatus,
  CalendarEventType,
} from "./calendar-event.entity";

export type ConfirmationChange = "start_cycle" | "clear" | "keep";

export interface NextConfirmationState {
  type: CalendarEventType;
  status: CalendarEventStatus;
  startsAt: Date;
  customerEmail: string | null;
}

// trim + lowercase; vazio/undefined/null => null.
export function normalizeCustomerEmail(
  email: string | null | undefined,
): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

const normalizeEmail = normalizeCustomerEmail;

/**
 * Decide o que fazer com o ciclo de confirmação ao criar/editar um evento.
 * - start_cycle: gera novo token e recomeça (novo evento com e-mail, reagendamento
 *   ou troca de e-mail);
 * - clear: encerra o ciclo (evento deixou de ser atendimento ou perdeu o e-mail);
 * - keep: não mexe (inclui cancelamento, edição só de título/descrição e
 *   evento que já começou: ciclo só é iniciado com startsAt > now).
 */
export function planConfirmationChange(
  existing: Pick<
    CalendarEventEntity,
    "type" | "startsAt" | "customerEmail" | "confirmationStatus"
  > | null,
  next: NextConfirmationState,
  now: Date = new Date(),
): ConfirmationChange {
  const plan = planWithoutClock(existing, next);
  if (plan === "start_cycle" && next.startsAt.getTime() <= now.getTime()) {
    return "keep";
  }
  return plan;
}

function planWithoutClock(
  existing: Pick<
    CalendarEventEntity,
    "type" | "startsAt" | "customerEmail" | "confirmationStatus"
  > | null,
  next: NextConfirmationState,
): ConfirmationChange {
  const nextEmail = normalizeEmail(next.customerEmail);
  const hasCycle = existing?.confirmationStatus != null;

  if (next.type !== "appointment" || nextEmail === null) {
    return hasCycle || normalizeEmail(existing?.customerEmail ?? null) !== null
      ? "clear"
      : "keep";
  }

  if (existing === null) return "start_cycle";
  if (next.status === "canceled") return "keep";

  if (existing.type !== "appointment") return "start_cycle";
  if (existing.startsAt.getTime() !== next.startsAt.getTime()) {
    return "start_cycle";
  }
  if (normalizeEmail(existing.customerEmail) !== nextEmail) return "start_cycle";
  return "keep";
}
