"use client"

import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"

interface AsyncOptionsResponse<T> {
  data: T[]
  truncated: boolean
}

interface UseAsyncOptionsParams {
  queryKey: readonly unknown[]
  path: string
  enabled?: boolean
}

export function useAsyncOptions<T>({
  queryKey,
  path,
  enabled = true,
}: UseAsyncOptionsParams) {
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey,
    queryFn: () => apiRequest<AsyncOptionsResponse<T>>(path),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  })

  return {
    options: data?.data ?? [],
    truncated: data?.truncated ?? false,
    loading: isLoading,
    isFetching,
    error: error instanceof Error ? error.message : null,
  }
}

// Mantém o registro selecionado exibível mesmo quando ele sai do resultado
// da busca corrente (ex.: usuário digita algo que não bate mais com o item
// já escolhido) — sem isso o combobox "perderia" a seleção visualmente.
export function useStickyOption<T>(
  options: T[],
  value: string | undefined,
  getId: (option: T) => string,
): T | undefined {
  const [sticky, setSticky] = React.useState<T | undefined>(undefined)

  React.useEffect(() => {
    if (!value) {
      setSticky(undefined)
      return
    }
    const match = options.find((option) => getId(option) === value)
    if (match) setSticky(match)
  }, [options, value, getId])

  if (!value) return undefined
  const current = options.find((option) => getId(option) === value)
  return current ?? sticky
}
