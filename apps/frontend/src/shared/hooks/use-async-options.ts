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
  const { data, isLoading, isFetching, error, refetch } = useQuery({
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
    // Retry barato para o estado de erro do AsyncCombobox — não confundir
    // falha de rede com "lista vazia" (ver async-combobox.tsx).
    refetch: () => void refetch(),
  }
}

// Mantém o registro selecionado exibível mesmo quando ele sai do resultado
// da busca corrente (ex.: usuário digita algo que não bate mais com o item
// já escolhido) — sem isso o combobox "perderia" a seleção visualmente.
//
// `initialOption` semeia a memória com um valor conhecido de antemão (ex.:
// em edição, o customerId/customerName que já vêm na própria entidade) para
// que o trigger mostre algo resolvido desde o primeiro render, antes mesmo
// da query de opções responder ou de o registro aparecer entre os
// resultados. Ele só é usado enquanto nenhum match real (vindo de `options`)
// é encontrado para o `value` corrente — assim que um aparece, substitui o
// seed. Chamadores que precisam saber se o valor retornado é só o seed (para
// não tratar dados incompletos do seed como resposta definitiva, ex.:
// verificação de idade) podem comparar por referência com o próprio
// `initialOption` que passaram.
export function useStickyOption<T>(
  options: T[],
  value: string | undefined,
  getId: (option: T) => string,
  initialOption?: T,
): T | undefined {
  const [sticky, setSticky] = React.useState<T | undefined>(() =>
    initialOption && value && getId(initialOption) === value
      ? initialOption
      : undefined,
  )

  React.useEffect(() => {
    if (!value) {
      setSticky(undefined)
      return
    }
    const match = options.find((option) => getId(option) === value)
    if (match) {
      setSticky(match)
      return
    }
    setSticky((prev) => {
      if (prev && getId(prev) === value) return prev
      if (initialOption && getId(initialOption) === value) return initialOption
      return undefined
    })
  }, [options, value, getId, initialOption])

  if (!value) return undefined
  const current = options.find((option) => getId(option) === value)
  return current ?? sticky
}
