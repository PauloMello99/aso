"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/infrastructure/api/client";
import { queryKeys } from "@/infrastructure/query/query-keys";
import type { CommissionMode, MemberCommission } from "../types";

export interface UpsertCommissionItem {
  userId: string;
  percent: string;
  mode: CommissionMode;
}

const EMPTY_COMMISSIONS: MemberCommission[] = [];

export function useMemberCommissions(orgId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.cashier.commissions(orgId),
    queryFn: () =>
      apiRequest<MemberCommission[]>(`/orgs/${orgId}/cashier/commissions`),
    enabled: !!orgId,
  });

  const upsertMutation = useMutation({
    mutationFn: (commissions: UpsertCommissionItem[]) =>
      // Backend retorna as entidades cruas de findActiveByOrg (id/orgId/userId/
      // percent/mode/active/supersededAt/createdBy/createdAt/updatedAt), não o
      // shape MemberCommission do GET (name/role/configured) — nenhum consumidor
      // lê o corpo, então não fingimos um shape que não existe.
      apiRequest<unknown>(`/orgs/${orgId}/cashier/commissions`, {
        method: "PUT",
        body: JSON.stringify({ commissions }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cashier.commissions(orgId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.overview.detail(orgId),
      });
    },
  });

  return {
    commissions: data ?? EMPTY_COMMISSIONS,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    upsertCommissions: (commissions: UpsertCommissionItem[]) =>
      upsertMutation.mutateAsync(commissions),
  };
}
