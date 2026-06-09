import type { MaterialsFilter } from "@/features/stock/types"

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
  // ─── Organizations ────────────────────────────────────────────────────────
  orgs: {
    /** Matches every orgs key (list + all detail entries) */
    all: ["orgs"] as const,
    /** All orgs belonging to the current user */
    list: () => ["orgs", "list"] as const,
    /** Single org by id */
    detail: (orgId: string) => ["orgs", "detail", orgId] as const,
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
} as const
