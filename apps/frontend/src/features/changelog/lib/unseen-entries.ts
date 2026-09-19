import {
  ORG_NAV_SECTIONS,
  canAccessModule,
} from "@/features/dashboard/lib/nav"
import type { ChangelogEntry } from "../schemas/changelog.schema"

type Role = "owner" | "employee"

const NAV_ITEMS = ORG_NAV_SECTIONS.flatMap((s) => s.items)

function canSeeModule(
  moduleHref: string,
  role: Role,
  permissions: readonly string[],
): boolean {
  const item = NAV_ITEMS.find((i) => i.href === moduleHref)
  if (!item) return true
  if (item.roles && !item.roles.includes(role)) return false
  return canAccessModule(role, permissions, item.module)
}

export function getUnseenEntries(
  entries: readonly ChangelogEntry[],
  seenVersion: number | null,
  role: Role,
  permissions: readonly string[],
): ChangelogEntry[] {
  const seen = seenVersion ?? 0
  return entries.filter((entry) => {
    if (entry.version <= seen) return false
    if (entry.audience === "owners" && role !== "owner") return false
    if (entry.module && !canSeeModule(entry.module, role, permissions)) {
      return false
    }
    return true
  })
}
