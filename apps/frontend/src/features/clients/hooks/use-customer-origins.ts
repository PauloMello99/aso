"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"

export interface CustomerOrigin {
  id: string
  name: string
}

export function useCustomerOrigins(orgId: string) {
  const { data = [] } = useQuery({
    queryKey: ["customer-origins", orgId],
    queryFn: () =>
      apiRequest<CustomerOrigin[]>(`/orgs/${orgId}/customers/origins`),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })
  return { origins: data }
}
