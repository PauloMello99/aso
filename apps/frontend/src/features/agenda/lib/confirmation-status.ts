import type { CalendarEvent } from "../types"

export type ConfirmationTone = "neutral" | "warning" | "success" | "danger"

export interface ConfirmationBadge {
  label: string
  tone: ConfirmationTone
}

type ConfirmationFields = Pick<
  CalendarEvent,
  "type" | "confirmationStatus" | "confirmationSentAt"
>

export function getConfirmationBadge(
  event: ConfirmationFields,
): ConfirmationBadge | null {
  if (event.type !== "appointment" || !event.confirmationStatus) return null
  switch (event.confirmationStatus) {
    case "pending":
      return event.confirmationSentAt
        ? { label: "Aguardando", tone: "warning" }
        : { label: "Não enviado", tone: "neutral" }
    case "confirmed":
      return { label: "Confirmado", tone: "success" }
    case "canceled_by_customer":
      return { label: "Cliente não vai", tone: "danger" }
  }
}

export function getConfirmationStatusText(
  event: ConfirmationFields,
): string | null {
  if (event.type !== "appointment" || !event.confirmationStatus) return null
  switch (event.confirmationStatus) {
    case "pending":
      return event.confirmationSentAt
        ? "Aguardando confirmação"
        : "Confirmação não enviada"
    case "confirmed":
      return "Confirmado pelo cliente"
    case "canceled_by_customer":
      return "Cliente avisou que não poderá ir"
  }
}
