import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query"
import { ApiError } from "@/infrastructure/api/client"
import { captureError } from "@/infrastructure/telemetry/telemetry"

/**
 * Decide se um erro de query/mutation deve ir ao error tracking. Falhas de
 * servidor (5xx), de rede (status 0) e erros inesperados (não-ApiError) são
 * reportados; erros de negócio esperados (4xx) ficam de fora para manter o
 * stream limpo — a UI já os trata.
 */
function isReportable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500
  }
  return true
}

/** Usa o 1º segmento da query key como módulo/feature (ex.: ["materials", …]). */
function moduleFromKey(key: readonly unknown[] | undefined): string {
  const first = key?.[0]
  return typeof first === "string" ? first : "unknown"
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (!isReportable(error)) return
      captureError(error, {
        source: "react-query",
        kind: "query",
        module: moduleFromKey(query.queryKey),
        queryKey: query.queryKey,
      })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!isReportable(error)) return
      captureError(error, {
        source: "react-query",
        kind: "mutation",
        module: moduleFromKey(mutation.options.mutationKey),
      })
    },
  }),
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 s — no background refetch within that window
      staleTime: 30_000,
      // Inactive cache entries are garbage-collected after 5 min
      gcTime: 5 * 60 * 1_000,
      // Retry once on transient failures; 404s will still resolve after 1 retry,
      // but that's acceptable — components guard on `isError`
      retry: 1,
      // Refetch on window focus so data stays up-to-date after tab switches
      refetchOnWindowFocus: true,
    },
    mutations: {
      // No automatic retry for mutations — let callers handle errors
      retry: 0,
    },
  },
})
