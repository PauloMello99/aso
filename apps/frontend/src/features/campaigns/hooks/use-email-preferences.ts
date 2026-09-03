"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { CampaignTrigger, EmailPreferences } from "../types"

export function useEmailPreferences(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.publicCampaigns.preferences(token ?? ""),
    queryFn: () =>
      apiRequest<EmailPreferences>(
        `/public/campaigns/preferences/${encodeURIComponent(token!)}`,
        { skipAuth: true },
      ),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

/**
 * Descadastro pela tela pública. Sem `trigger` = opt-out global. O componente
 * chama `refetch()` do GET no sucesso, então a invalidação de cache fica a
 * cargo dele (não há outra tela pública a sincronizar).
 */
export function useUnsubscribe(token: string | undefined) {
  return useMutation({
    mutationFn: (trigger?: CampaignTrigger) =>
      apiRequest<void>(
        `/public/campaigns/unsubscribe/${encodeURIComponent(token!)}`,
        {
          method: "POST",
          body: JSON.stringify(trigger ? { trigger } : {}),
          skipAuth: true,
        },
      ),
  })
}
