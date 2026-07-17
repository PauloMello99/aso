import type { MaterialsFilter } from "@/features/stock/types"
import type { CustomersFilter } from "@/features/clients/types"
import type { TransactionsFilter } from "@/features/cashier/types"
import type { ServicesFilter } from "@/features/services/types"

/**
 * Centralised query key factory.
 *
 * Shape: [domain, ...scope, operation?, params?]
 *
 * Broad invalidation: pass only the prefix that all affected keys share.
 * Example — invalidate all org-X materials:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.materials.all(orgId) })
 */
export const queryKeys = {
  // ─── Current user ─────────────────────────────────────────────────────────
  me: ["me"] as const,

  // ─── Organizations ────────────────────────────────────────────────────────
  orgs: {
    /** Matches every orgs key (list + all detail entries) */
    all: ["orgs"] as const,
    /** All orgs belonging to the current user */
    list: () => ["orgs", "list"] as const,
    /** Single org by id */
    detail: (orgId: string) => ["orgs", "detail", orgId] as const,
    /** Single org resolved by slug (super_admin deep-link) */
    bySlug: (slug: string) => ["orgs", "by-slug", slug] as const,
  },

  // ─── Overview (agregado) ───────────────────────────────────────────────────
  overview: {
    /** Resumo agregado da org (PERF-2) */
    detail: (orgId: string) => ["overview", orgId] as const,
    /** KPIs + série temporal (PERF-3), escopado por período */
    analytics: (orgId: string, from?: string, to?: string) =>
      ["overview", orgId, "analytics", from ?? "", to ?? ""] as const,
  },

  // ─── Members & Invitations ─────────────────────────────────────────────────
  members: {
    /** Matches all member-related keys for an org */
    all: (orgId: string) => ["members", orgId] as const,
    /** Active member list */
    list: (orgId: string) => ["members", orgId, "list"] as const,
    /** Pending invitations */
    invitations: (orgId: string) => ["members", orgId, "invitations"] as const,
  },

  // ─── Materials (Stock) ─────────────────────────────────────────────────────
  materials: {
    /** Matches all material keys for an org */
    all: (orgId: string) => ["materials", orgId] as const,
    /** Material list, optionally scoped by filter */
    list: (orgId: string, filter?: MaterialsFilter) =>
      ["materials", orgId, "list", filter ?? {}] as const,
    /** Stock movements for a specific material */
    movements: (orgId: string, materialId: string) =>
      ["materials", orgId, "movements", materialId] as const,
  },

  // ─── Customers (Clients) ───────────────────────────────────────────────────
  customers: {
    /** Matches all customer keys for an org */
    all: (orgId: string) => ["customers", orgId] as const,
    /** Customer list, optionally scoped by filter */
    list: (orgId: string, filter?: CustomersFilter) =>
      ["customers", orgId, "list", filter ?? {}] as const,
    /** Single customer detail */
    detail: (orgId: string, id: string) =>
      ["customers", orgId, "detail", id] as const,
  },

  // ─── Cashier (Caixa) ───────────────────────────────────────────────────────
  cashier: {
    /** Matches every cashier key for an org (transactions + balance + fees) */
    all: (orgId: string) => ["cashier", orgId] as const,
    /** Transaction list, optionally scoped by filter */
    list: (orgId: string, filter?: TransactionsFilter) =>
      ["cashier", orgId, "list", filter ?? {}] as const,
    /** Current balance snapshot */
    balance: (orgId: string) => ["cashier", orgId, "balance"] as const,
    /** Daily balance history within a range */
    history: (orgId: string, from?: string, to?: string) =>
      ["cashier", orgId, "history", from ?? "", to ?? ""] as const,
    /** Payment fee configuration */
    fees: (orgId: string) => ["cashier", orgId, "fees"] as const,
    /** Configurable transaction categories */
    categories: (orgId: string) => ["cashier", orgId, "categories"] as const,
  },

  // ─── Admin (plataforma / super_admin) ──────────────────────────────────────
  admin: {
    all: ["admin"] as const,
    stats: () => ["admin", "stats"] as const,
    growth: () => ["admin", "stats", "growth"] as const,
    orgs: () => ["admin", "orgs"] as const,
    orgDetail: (id: string) => ["admin", "orgs", "detail", id] as const,
    users: () => ["admin", "users"] as const,
    userDetail: (id: string) => ["admin", "users", "detail", id] as const,
    auditLogs: (filters?: Record<string, unknown>) =>
      ["admin", "audit-logs", filters ?? {}] as const,
  },

  // ─── Services (Atendimentos) ───────────────────────────────────────────────
  services: {
    /** Matches every service key for an org (list + types + detail) */
    all: (orgId: string) => ["services", orgId] as const,
    /** Service list, optionally scoped by filter */
    list: (orgId: string, filter?: ServicesFilter) =>
      ["services", orgId, "list", filter ?? {}] as const,
    /** Single service detail */
    detail: (orgId: string, id: string) =>
      ["services", orgId, "detail", id] as const,
    /** Configurable service types */
    types: (orgId: string) => ["services", orgId, "types"] as const,
  },
} as const
