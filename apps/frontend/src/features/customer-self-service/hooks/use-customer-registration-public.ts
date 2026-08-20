"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { AnamnesisAnswerInput } from "@/features/anamnesis"
import type { CustomerRegistrationLookup } from "../types"

export function useCustomerRegistrationLookup(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customerSelfService.registration(token ?? ""),
    queryFn: () =>
      apiRequest<CustomerRegistrationLookup>(
        `/public/customer-registrations/${encodeURIComponent(token!)}`,
        { skipAuth: true },
      ),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

interface SubmitCustomerRegistrationBody {
  name: string
  birthDate: string
  phone?: string | null
  gender?: "male" | "female" | "other" | null
  address: string
  number: string
  addressLine2?: string | null
  city: string
  state: string
  postalCode?: string | null
  country?: string | null
  answers: AnamnesisAnswerInput[]
  signerFullName: string
  signerCpf?: string
  signatureImageBase64: string
  consentAccepted: boolean
  consentVersion: string
}

export function useSubmitCustomerRegistration(token: string | undefined) {
  return useMutation({
    mutationFn: (body: SubmitCustomerRegistrationBody) =>
      apiRequest<{ customerId: string }>(
        `/public/customer-registrations/${encodeURIComponent(token!)}/submit`,
        {
          method: "POST",
          body: JSON.stringify(body),
          skipAuth: true,
        },
      ),
  })
}
