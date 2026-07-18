import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query"
import { ApiError } from "@/infrastructure/api/client"
import { captureError } from "@/infrastructure/telemetry/telemetry"

function isReportable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500
  }
  return true
}

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
      staleTime: 30_000,
      gcTime: 5 * 60 * 1_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
