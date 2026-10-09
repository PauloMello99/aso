import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export const SCHEDULE_DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 h" },
  { value: 90, label: "1 h 30" },
  { value: 120, label: "2 h" },
  { value: 180, label: "3 h" },
  { value: 240, label: "4 h" },
  { value: 300, label: "5 h" },
  { value: 360, label: "6 h" },
  { value: 480, label: "8 h" },
] as const

export const DEFAULT_SCHEDULE_DURATION = 60

export function isScheduleDuration(value: number): boolean {
  return SCHEDULE_DURATION_OPTIONS.some((option) => option.value === value)
}

interface SchedulePayloadInput {
  date: string
  startTime: string
  durationMinutes: number
}

/**
 * Monta o corpo do POST /schedule a partir de data + hora em horário local
 * (mesma construção do event-form da agenda). Lança se a data/hora for inválida.
 */
export function buildSchedulePayload({
  date,
  startTime,
  durationMinutes,
}: SchedulePayloadInput): { startsAt: string; durationMinutes: number } {
  const startsAt = new Date(`${date}T${startTime}:00`)
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Data ou horário inválido")
  }
  return { startsAt: startsAt.toISOString(), durationMinutes }
}

/** "dd/MM 'às' HH:mm" em horário local. */
export function formatScheduledLabel(iso: string): string {
  return format(parseISO(iso), "dd/MM 'às' HH:mm", { locale: ptBR })
}
