const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Filtros De/Até chegam do DatePicker como `YYYY-MM-DD`; a API os lê como
 * instantes (`new Date(str)` = meia-noite UTC), o que deixa o último dia de
 * fora. Converte para o início/fim do dia no fuso local (mesma convenção de
 * performedAt/transactedAt).
 *
 * Idempotente: valores que já são instantes ISO (não date-only) passam
 * intactos, então é seguro aplicar mais de uma vez sobre o mesmo filtro.
 */
export function dayStartIso(day: string): string {
  if (!DATE_ONLY.test(day)) return day
  return new Date(`${day}T00:00:00.000`).toISOString()
}

export function dayEndIso(day: string): string {
  if (!DATE_ONLY.test(day)) return day
  return new Date(`${day}T23:59:59.999`).toISOString()
}
