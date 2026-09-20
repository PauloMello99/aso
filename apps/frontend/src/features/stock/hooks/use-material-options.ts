"use client"

import { useAsyncOptions } from "@/shared/hooks/use-async-options"
import { buildOptionsQuery } from "@/shared/lib/options-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Material } from "../types"

export function useMaterialOptions(
  orgId: string,
  params?: { q?: string; serviceTypeId?: string },
) {
  return useAsyncOptions<Material>({
    queryKey: queryKeys.materials.options(orgId, params),
    path: `/orgs/${orgId}/materials/options${buildOptionsQuery({
      q: params?.q,
      serviceTypeId: params?.serviceTypeId,
    })}`,
    enabled: !!orgId,
  })
}
