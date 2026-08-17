"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { PublicBillingPlan } from "../types"

// GET /public/billing/plans fica atrás de um kill-switch
// (PUBLIC_PRICING_ENABLED) que responde 404 quando desligado — o padrão na
// maioria dos ambientes. Por isso não tratamos erro/404 como falha visível:
// os intervalos indisponíveis (por flag desligada ou lista vazia) resolvem
// para "sem dados", e quem consome este hook decide o fallback (hoje:
// assumir apenas "monthly").
export function usePublicBillingPlans() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.publicBilling.plans(),
    queryFn: () => apiRequest<PublicBillingPlan[]>("/public/billing/plans"),
    retry: false,
    throwOnError: false,
  })

  return {
    plans: data ?? [],
    loading: isLoading,
  }
}
