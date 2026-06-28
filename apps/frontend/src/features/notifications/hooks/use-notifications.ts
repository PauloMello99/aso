"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import type { NotificationsResponse } from "../types"

const KEY = ["notifications"] as const

/** Cadência de polling (PERF-1). Menos agressiva que os 30s antigos. */
const POLL_INTERVAL_MS = 60_000

export function useNotifications() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => apiRequest<NotificationsResponse>("/me/notifications"),
    // Polla a cada 60s só com a aba em foco; em background não dispara
    // (refetchIntervalInBackground=false) — evita o polling agressivo do preview.
    // O refetch on focus garante atualização imediata ao voltar para a aba.
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: KEY })

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/me/notifications/${id}/read`, { method: "POST" }),
    onSuccess: invalidate,
  })

  const markAllRead = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/me/notifications/read-all`, { method: "POST" }),
    onSuccess: invalidate,
  })

  return {
    items: data?.items ?? [],
    unread: data?.unread ?? 0,
    loading: isLoading,
    markRead: (id: string) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
  }
}
