"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ApiError } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import {
  declineQuoteRequest,
  getQuoteRequest,
  getUnreadQuoteCount,
  listQuoteRequests,
  markQuoteRequestViewed,
  scheduleQuoteRequest,
} from "../api/quote-requests.api"
import type {
  QuoteRequestsPage,
  ScheduleQuoteRequestBody,
  UnreadQuoteCount,
} from "../types"

const POLL_INTERVAL_MS = 60_000
// URLs assinadas do detalhe valem 300s: reaproveita o cache só enquanto ainda
// são válidas (4 min) e nunca mantém o detalhe em cache depois de desmontar.
const DETAIL_STALE_TIME_MS = 240_000

// 404 = flag desligada ou pedido fora de escopo/expirado; 403 = OrgModuleGuard
// (sem a permissão 'quotes'). Ambos significam "indisponível" para a UI.
function isNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 404 || error.status === 403)
  )
}

/**
 * Pedido já respondido/expirado/fora de escopo (404) ou evento já criado para o
 * pedido por outra requisição (409 CALENDAR_EVENT_SOURCE_CONFLICT).
 */
export function isQuoteAlreadyResolvedError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 ||
      (error.status === 409 && error.code === "CALENDAR_EVENT_SOURCE_CONFLICT"))
  )
}

export function useQuoteRequests(orgId: string, page: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.quoteRequests.list(orgId, page),
    queryFn: () => listQuoteRequests(orgId, page),
    enabled: !!orgId,
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const notFound = isNotFound(error)

  return {
    data: data ?? null,
    loading: isLoading,
    /** 404 = recurso desligado (flag); 403 = sem permissão no módulo. */
    notFound,
    error: error && !notFound ? error : null,
    refetch,
  }
}

export function useQuoteRequest(orgId: string, id: string | null) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.quoteRequests.detail(orgId, id ?? ""),
    queryFn: () => getQuoteRequest(orgId, id as string),
    enabled: !!orgId && !!id,
    staleTime: DETAIL_STALE_TIME_MS,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const notFound = isNotFound(error)

  return {
    data: data ?? null,
    loading: isLoading,
    refetching: isFetching && !isLoading,
    notFound,
    error: error && !notFound ? error : null,
    refetch,
  }
}

export function useUnreadQuoteCount(orgId: string, enabled: boolean) {
  const { data } = useQuery({
    queryKey: queryKeys.quoteRequests.unreadCount(orgId),
    queryFn: () => getUnreadQuoteCount(orgId),
    enabled: !!orgId && enabled,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: false,
  })

  return { unread: data?.unread ?? 0 }
}

export function useScheduleQuoteRequest(orgId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: ScheduleQuoteRequestBody
    }) => scheduleQuoteRequest(orgId, id, body),
    onSuccess: (_result, { id }) => {
      queryClient.removeQueries({
        queryKey: queryKeys.quoteRequests.detail(orgId, id),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quoteRequests.all(orgId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.all(orgId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.overview.detail(orgId),
      })
    },
    onError: (error, { id }) => {
      if (!isQuoteAlreadyResolvedError(error)) return
      queryClient.removeQueries({
        queryKey: queryKeys.quoteRequests.detail(orgId, id),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quoteRequests.all(orgId),
      })
    },
  })

  return {
    schedule: mutation.mutateAsync,
    isPending: mutation.isPending,
    reset: mutation.reset,
  }
}

export function useDeclineQuoteRequest(orgId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: string) => declineQuoteRequest(orgId, id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({
        queryKey: queryKeys.quoteRequests.detail(orgId, id),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quoteRequests.all(orgId),
      })
    },
    onError: (error, id) => {
      if (!isQuoteAlreadyResolvedError(error)) return
      queryClient.removeQueries({
        queryKey: queryKeys.quoteRequests.detail(orgId, id),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quoteRequests.all(orgId),
      })
    },
  })

  return {
    decline: mutation.mutateAsync,
    isPending: mutation.isPending,
    reset: mutation.reset,
  }
}

export function useMarkQuoteRequestViewed(orgId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: string) => markQuoteRequestViewed(orgId, id),
    onMutate: (id: string) => {
      queryClient.setQueriesData<QuoteRequestsPage>(
        { queryKey: queryKeys.quoteRequests.lists(orgId) },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === id ? { ...item, viewed: true } : item,
                ),
              }
            : current,
      )
      queryClient.setQueryData<UnreadQuoteCount>(
        queryKeys.quoteRequests.unreadCount(orgId),
        (current) =>
          current ? { unread: Math.max(0, current.unread - 1) } : current,
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quoteRequests.unreadCount(orgId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quoteRequests.lists(orgId),
      })
    },
  })

  return { markViewed: mutation.mutate }
}
