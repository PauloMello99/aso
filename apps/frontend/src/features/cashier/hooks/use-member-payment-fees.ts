"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/infrastructure/api/client";
import { queryKeys } from "@/infrastructure/query/query-keys";
import type { MemberPaymentFee, MemberPaymentFeesUpdate } from "../types";

const EMPTY_MEMBER_FEES: MemberPaymentFee[] = [];

export function useMemberPaymentFees(orgId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.cashier.memberFees(orgId),
    queryFn: () =>
      apiRequest<MemberPaymentFee[]>(`/orgs/${orgId}/cashier/member-fees`),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ fees, deactivations }: MemberPaymentFeesUpdate) =>
      // `fees` faz upsert dos overrides do membro; `deactivations` remove o
      // override daquele método (volta ao fallback da org). Backend retorna
      // apenas as linhas ativas do membro (userId/paymentMethod/percent/
      // fixedCents), não o shape MemberPaymentFee do GET (name/role/source/
      // configured) — nenhum consumidor lê o corpo, então não fingimos um shape
      // que não existe.
      apiRequest<unknown>(`/orgs/${orgId}/cashier/member-fees`, {
        method: "PUT",
        body: JSON.stringify({ fees, deactivations }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cashier.memberFees(orgId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cashier.fees(orgId),
      });
    },
  });

  return {
    memberFees: data ?? EMPTY_MEMBER_FEES,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    updateMemberFees: (payload: MemberPaymentFeesUpdate) =>
      updateMutation.mutateAsync(payload),
  };
}
