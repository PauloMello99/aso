import type { ServicesFilter } from "@/features/services/types"
import { dayEndIso, dayStartIso } from "@/shared/lib/day-bounds"

/**
 * `GET /services` assume "início do mês corrente" quando `from` não é enviado.
 * Na tela do membro as métricas do resumo são vitalícias, então a lista pede
 * todo o histórico por padrão (o filtro De/Até restringe).
 */
export const ALL_SERVICES_FROM = "1970-01-01"

export function buildMemberServicesFilter(
  filter: ServicesFilter,
  userId: string,
): ServicesFilter {
  return {
    ...filter,
    from: dayStartIso(filter.from || ALL_SERVICES_FROM),
    to: filter.to ? dayEndIso(filter.to) : undefined,
    performedBy: userId,
  }
}

function formatIsoDay(iso: string): string {
  const [y, m, d] = iso.split("-")
  return y && m && d ? `${d}/${m}/${y}` : iso
}

/** Rótulo do período efetivo da lista de serviços do membro. */
export function formatMemberServicesPeriod(filter: ServicesFilter): string {
  if (!filter.from && !filter.to) return "Todos os períodos"
  if (filter.from && filter.to) {
    return `De ${formatIsoDay(filter.from)} até ${formatIsoDay(filter.to)}`
  }
  if (filter.from) return `A partir de ${formatIsoDay(filter.from)}`
  return `Até ${formatIsoDay(filter.to as string)}`
}
