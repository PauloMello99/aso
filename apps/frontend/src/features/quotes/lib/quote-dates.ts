import { formatDistance, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

const DAY_MS = 24 * 60 * 60 * 1000
const EXPIRY_WARNING_DAYS = 3

/** "há 2 horas", "há 3 dias"... relativo a `now`. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  return formatDistance(parseISO(iso), now, { addSuffix: true, locale: ptBR })
}

/**
 * Dias inteiros restantes até `expiresAt` (arredondado para baixo): 0 = expira
 * nas próximas 24h, negativo = já expirou.
 */
export function daysUntil(expiresAt: string, now: Date = new Date()): number {
  return Math.floor((parseISO(expiresAt).getTime() - now.getTime()) / DAY_MS)
}

export type ExpiryTone = "info" | "warning" | "destructive"

export interface ExpiryDescription {
  label: string
  tone: ExpiryTone
}

export function describeExpiry(
  expiresAt: string,
  now: Date = new Date(),
): ExpiryDescription {
  const days = daysUntil(expiresAt, now)
  if (days < 0) return { label: "Expirado", tone: "destructive" }
  if (days === 0) return { label: "Expira hoje", tone: "warning" }
  return {
    label: days === 1 ? "Expira em 1 dia" : `Expira em ${days} dias`,
    tone: days <= EXPIRY_WARNING_DAYS ? "warning" : "info",
  }
}
