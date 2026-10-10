import type { CalendarEventConfirmationStatus } from "../types"

const TIME_ZONE = "America/Sao_Paulo"

export const CANCELED_BY_STUDIO_MESSAGE =
  "Este horário foi cancelado pelo estúdio."

export function getConfirmationErrorMessage(
  status: number | undefined,
): string {
  switch (status) {
    case 404:
      return "Link inválido ou substituído por um e-mail mais recente."
    case 410:
      return "Este link expirou."
    case 409:
      return CANCELED_BY_STUDIO_MESSAGE
    case 429:
      return "Muitas tentativas. Tente novamente em alguns minutos."
    default:
      return "Não foi possível carregar o agendamento. Tente novamente."
  }
}

export function getConfirmationSuccessMessage(
  status: CalendarEventConfirmationStatus,
): string | null {
  if (status === "confirmed") return "Presença confirmada. Obrigado!"
  if (status === "canceled_by_customer") {
    return "Registramos que você não poderá ir."
  }
  return null
}

export function formatConfirmationDateTime(
  startsAt: string,
  endsAt: string,
  allDay: boolean,
): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(start)
  if (allDay) return date
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${date}, ${time.format(start)} às ${time.format(end)}`
}
