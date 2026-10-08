export interface MonthRef {
  year: number
  /** 0-11, igual a Date#getMonth. */
  month: number
}

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
]

export function currentMonth(now: Date): MonthRef {
  return { year: now.getFullYear(), month: now.getMonth() }
}

/** Chave estável "YYYY-MM" — usada na query key (não muda a cada render). */
export function monthKey(ref: MonthRef): string {
  return `${ref.year}-${String(ref.month + 1).padStart(2, "0")}`
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const index = ref.year * 12 + ref.month + delta
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 }
}

export function isCurrentMonth(ref: MonthRef, now: Date): boolean {
  const cur = currentMonth(now)
  return cur.year === ref.year && cur.month === ref.month
}

export function isFutureMonth(ref: MonthRef, now: Date): boolean {
  const cur = currentMonth(now)
  return ref.year * 12 + ref.month > cur.year * 12 + cur.month
}

/** Só permite avançar enquanto o mês seguinte não for futuro. */
export function canGoNext(ref: MonthRef, now: Date): boolean {
  return !isFutureMonth(shiftMonth(ref, 1), now)
}

/** Garante que um mês nunca ultrapasse o mês corrente. */
export function clampToCurrent(ref: MonthRef, now: Date): MonthRef {
  return isFutureMonth(ref, now) ? currentMonth(now) : ref
}

/**
 * Intervalo do mês no fuso local: do dia 1 às 00:00 até o último instante do
 * mês (23:59:59.999) — ou "agora", se for o mês corrente.
 */
export function monthRange(
  ref: MonthRef,
  now: Date,
): { from: string; to: string } {
  const from = new Date(ref.year, ref.month, 1, 0, 0, 0, 0)
  if (isCurrentMonth(ref, now)) {
    return { from: from.toISOString(), to: now.toISOString() }
  }
  const to = new Date(ref.year, ref.month + 1, 0, 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** "outubro de 2026" */
export function formatMonthLabel(ref: MonthRef): string {
  return `${MONTH_NAMES[ref.month]} de ${ref.year}`
}
