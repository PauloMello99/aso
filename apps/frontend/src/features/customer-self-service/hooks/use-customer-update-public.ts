"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { CustomerUpdateLookup } from "../types"
import type { CustomerUpdateSubmitBody } from "../lib/build-partial-update-body"

export function useCustomerUpdateLookup(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customerSelfService.update(token ?? ""),
    queryFn: () =>
      apiRequest<CustomerUpdateLookup>(
        `/public/customer-updates/${encodeURIComponent(token!)}`,
        { skipAuth: true },
      ),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useSubmitCustomerUpdate(token: string | undefined) {
  return useMutation({
    mutationFn: (body: CustomerUpdateSubmitBody) =>
      apiRequest<{ customerId: string }>(
        `/public/customer-updates/${encodeURIComponent(token!)}/submit`,
        {
          method: "POST",
          body: JSON.stringify(body),
          skipAuth: true,
        },
      ),
  })
}
