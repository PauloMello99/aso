"use client"

import { useAsyncOptions } from "@/shared/hooks/use-async-options"
import { buildOptionsQuery } from "@/shared/lib/options-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { CustomerOption } from "../types"

export function useCustomerOptions(orgId: string, params?: { q?: string }) {
  return useAsyncOptions<CustomerOption>({
    queryKey: queryKeys.customers.options(orgId, params),
    path: `/orgs/${orgId}/customers/options${buildOptionsQuery({ q: params?.q })}`,
    enabled: !!orgId,
  })
}
