"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"

export type CalendarProvider = "google" | "outlook" | "apple"

export interface CalendarConnection {
  id: string
  orgId: string
  provider: CalendarProvider
  externalAccountEmail: string | null
  connectedBy: string | null
  connectedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CalendarConnectionResult {
  /** Flag global: a integração viva (OAuth/sync) está atrás dela. */
  enabled: boolean
  connection: CalendarConnection | null
}

export function useCalendarConnection(orgId: string) {
  const queryClient = useQueryClient()
  const key = ["calendar-connection", orgId] as const

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () =>
      apiRequest<CalendarConnectionResult>(`/orgs/${orgId}/calendar-connection`),
    enabled: !!orgId,
  })

  const disconnectMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/orgs/${orgId}/calendar-connection`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return {
    enabled: data?.enabled ?? false,
    connection: data?.connection ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    disconnect: () => disconnectMutation.mutateAsync(),
  }
}
