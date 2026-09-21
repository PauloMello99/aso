import type { ServicesFilter } from "@/features/services/types"
import { dayEndIso, dayStartIso } from "@/shared/lib/day-bounds"

/**
 * `GET /services` assume "início do mês corrente" quando `from` não é enviado.
 * Na tela do membro as métricas do resumo são vitalícias, então a lista pede
 * todo o histórico por padrão (o filtro De/Até restringe).
 */
export const ALL_SERVICES_FROM = "1970-01-01"

/** Tamanho de página (servidor) das listas de serviços/transações do membro. */
export const MEMBER_LIST_PAGE_SIZE = 10

export function buildMemberServicesFilter(
  filter: ServicesFilter,
  userId: string,
): ServicesFilter {
  return {
    ...filter,
    from: dayStartIso(filter.from || ALL_SERVICES_FROM),
    to: filter.to ? dayEndIso(filter.to) : undefined,
    performedBy: userId,
    page: filter.page ?? 1,
    limit: MEMBER_LIST_PAGE_SIZE,
  }
}

/** Aplica uma mudança de filtro e volta para a página 1 (paginação no servidor). */
export function patchServicesFilter(
  filter: ServicesFilter,
  patch: Partial<ServicesFilter>,
): ServicesFilter {
  return { ...filter, ...patch, page: 1 }
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
