import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
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
