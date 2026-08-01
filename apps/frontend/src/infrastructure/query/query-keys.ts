import type { MaterialsFilter } from "@/features/stock/types"
import type { CustomersFilter } from "@/features/clients/types"
import type { TransactionsFilter } from "@/features/cashier/types"
import type { ServicesFilter } from "@/features/services/types"

export const queryKeys = {
  me: ["me"] as const,

  orgs: {
    all: ["orgs"] as const,
    list: () => ["orgs", "list"] as const,
    detail: (orgId: string) => ["orgs", "detail", orgId] as const,
    bySlug: (slug: string) => ["orgs", "by-slug", slug] as const,
  },

  overview: {
    detail: (orgId: string) => ["overview", orgId] as const,
    analytics: (orgId: string, from?: string, to?: string) =>
      ["overview", orgId, "analytics", from ?? "", to ?? ""] as const,
  },

  members: {
    all: (orgId: string) => ["members", orgId] as const,
    list: (orgId: string) => ["members", orgId, "list"] as const,
    invitations: (orgId: string) => ["members", orgId, "invitations"] as const,
  },

  materials: {
    all: (orgId: string) => ["materials", orgId] as const,
    list: (orgId: string, filter?: MaterialsFilter) =>
      ["materials", orgId, "list", filter ?? {}] as const,
    movements: (orgId: string, materialId: string) =>
      ["materials", orgId, "movements", materialId] as const,
  },

  customers: {
    all: (orgId: string) => ["customers", orgId] as const,
    list: (orgId: string, filter?: CustomersFilter) =>
      ["customers", orgId, "list", filter ?? {}] as const,
    detail: (orgId: string, id: string) =>
      ["customers", orgId, "detail", id] as const,
    attachments: (orgId: string, customerId: string) =>
      ["customers", orgId, "detail", customerId, "attachments"] as const,
  },

  cashier: {
    all: (orgId: string) => ["cashier", orgId] as const,
    list: (orgId: string, filter?: TransactionsFilter) =>
      ["cashier", orgId, "list", filter ?? {}] as const,
    balance: (orgId: string) => ["cashier", orgId, "balance"] as const,
    history: (orgId: string, from?: string, to?: string) =>
      ["cashier", orgId, "history", from ?? "", to ?? ""] as const,
    fees: (orgId: string) => ["cashier", orgId, "fees"] as const,
    categories: (orgId: string) => ["cashier", orgId, "categories"] as const,
  },

  admin: {
    all: ["admin"] as const,
    stats: () => ["admin", "stats"] as const,
    growth: () => ["admin", "stats", "growth"] as const,
    orgs: () => ["admin", "orgs"] as const,
    orgDetail: (id: string) => ["admin", "orgs", "detail", id] as const,
    orgNotifications: (id: string) =>
      ["admin", "orgs", "detail", id, "notifications"] as const,
    users: () => ["admin", "users"] as const,
    userDetail: (id: string) => ["admin", "users", "detail", id] as const,
    auditLogs: (filters?: Record<string, unknown>) =>
      ["admin", "audit-logs", filters ?? {}] as const,
  },

  services: {
    all: (orgId: string) => ["services", orgId] as const,
    list: (orgId: string, filter?: ServicesFilter) =>
      ["services", orgId, "list", filter ?? {}] as const,
    detail: (orgId: string, id: string) =>
      ["services", orgId, "detail", id] as const,
    types: (orgId: string) => ["services", orgId, "types"] as const,
    media: (orgId: string, serviceId: string) =>
      ["services", orgId, "detail", serviceId, "media"] as const,
  },

  anamnesis: {
    form: (orgId: string, serviceTypeId: string) =>
      ["anamnesis", orgId, serviceTypeId, "form"] as const,
    versions: (orgId: string, serviceTypeId: string) =>
      ["anamnesis", orgId, serviceTypeId, "versions"] as const,
    publicResponse: (token: string) => ["anamnesis", "public", token] as const,
  },

  billing: {
    subscription: (orgId: string) => ["billing", orgId, "subscription"] as const,
  },

  adminSubscription: {
    detail: (orgId: string) => ["admin", orgId, "subscription"] as const,
    invoices: (orgId: string) => ["admin", orgId, "subscription", "invoices"] as const,
  },
} as const
