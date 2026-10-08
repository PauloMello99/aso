/**
 * Preferências de exibição do overview (por gráfico/seção), salvas em
 * localStorage por organização. Lógica pura: parse/validação sem tocar no DOM.
 */
export const VIEW_OPTIONS = {
  operationsLayout: ["grid", "list"],
  balance: ["area", "line"],
  materials: ["bars-h", "list"],
  servicesByType: ["bars-h", "bars-v"],
  revenueByProfessional: ["bars-h", "bars-v"],
  paymentMethods: ["both", "donut", "list"],
} as const

export type ViewId = keyof typeof VIEW_OPTIONS
export type ViewOption<K extends ViewId> = (typeof VIEW_OPTIONS)[K][number]

export type ViewPreferences = { [K in ViewId]: ViewOption<K> }

export const DEFAULT_VIEW_PREFERENCES: ViewPreferences = {
  operationsLayout: "grid",
  balance: "area",
  materials: "bars-h",
  servicesByType: "bars-h",
  revenueByProfessional: "bars-h",
  paymentMethods: "both",
}

export function viewPreferencesStorageKey(orgId: string): string {
  return `inkops_overview_view_${orgId}`
}

/** Devolve o valor se estiver na lista permitida; senão o fallback (sem cast). */
function pick<O extends readonly string[]>(
  options: O,
  value: unknown,
  fallback: O[number],
): O[number] {
  return options.find((o) => o === value) ?? fallback
}

/**
 * Converte o valor cru do localStorage em preferências válidas. Qualquer coisa
 * corrompida (JSON inválido, tipo errado, opção fora da lista) cai no default,
 * chave a chave.
 */
export function parseViewPreferences(raw: string | null): ViewPreferences {
  const result: ViewPreferences = { ...DEFAULT_VIEW_PREFERENCES }
  if (!raw) return result

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return result
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return result
  }
  const record = parsed as Record<string, unknown>

  const d = DEFAULT_VIEW_PREFERENCES
  return {
    operationsLayout: pick(
      VIEW_OPTIONS.operationsLayout,
      record.operationsLayout,
      d.operationsLayout,
    ),
    balance: pick(VIEW_OPTIONS.balance, record.balance, d.balance),
    materials: pick(VIEW_OPTIONS.materials, record.materials, d.materials),
    servicesByType: pick(
      VIEW_OPTIONS.servicesByType,
      record.servicesByType,
      d.servicesByType,
    ),
    revenueByProfessional: pick(
      VIEW_OPTIONS.revenueByProfessional,
      record.revenueByProfessional,
      d.revenueByProfessional,
    ),
    paymentMethods: pick(
      VIEW_OPTIONS.paymentMethods,
      record.paymentMethods,
      d.paymentMethods,
    ),
  }
}

export function serializeViewPreferences(prefs: ViewPreferences): string {
  return JSON.stringify(prefs)
}

export function withViewPreference<K extends ViewId>(
  prefs: ViewPreferences,
  id: K,
  value: ViewOption<K>,
): ViewPreferences {
  return { ...prefs, [id]: value }
}
