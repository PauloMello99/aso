"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type {
  AppointmentConfirmationResponse,
  PublicAppointmentConfirmation,
} from "../types"

export function useAppointmentConfirmationPublic(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.publicAppointmentConfirmation.detail(token ?? ""),
    queryFn: () =>
      apiRequest<PublicAppointmentConfirmation>(
        `/public/appointment-confirmations/${encodeURIComponent(token!)}`,
        { skipAuth: true },
      ),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useRespondAppointmentConfirmation(token: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (response: AppointmentConfirmationResponse) =>
      apiRequest<PublicAppointmentConfirmation>(
        `/public/appointment-confirmations/${encodeURIComponent(token!)}/respond`,
        {
          method: "POST",
          body: JSON.stringify({ response }),
          skipAuth: true,
        },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.publicAppointmentConfirmation.detail(token ?? ""),
        data,
      )
    },
  })
}
