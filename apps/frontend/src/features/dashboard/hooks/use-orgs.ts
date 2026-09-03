"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"

export interface OrgSummary {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  role: "owner" | "employee"
  permissions: string[]
}

export function useOrgs() {
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.orgs.list(),
    queryFn: () => apiRequest<OrgSummary[]>("/orgs"),
  })

  return {
    orgs: data,
    loading: isLoading,
    refetch,
  }
}

export function useResolveOrgBySlug(slug: string | undefined, enabled: boolean) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.orgs.bySlug(slug ?? ""),
    queryFn: () => apiRequest<OrgSummary>(`/orgs/by-slug/${slug}`),
    enabled: enabled && !!slug,
    retry: false,
    // Cada GET /orgs/by-slug/:slug de um super_admin sem membership emite um audit_log
    // `org_admin_access`. Enquanto a entrada seguir no cache, o evento representa a SESSÃO
    // de acesso, não um cache miss: sem isso, cada renavegação após o staleTime global (30s)
    // e cada refoco de janela gravaria uma linha nova. Trade-off: uma renomeação da org
    // durante a sessão só reflete após reload (o `gcTime` global ainda descarta a entrada
    // após 5 min inativa, quando uma nova visita emite outra linha — aceito).
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  return {
    org: data ?? null,
    loading: isLoading,
    notFound: isError,
  }
}

export function useOrg(orgId: string) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.orgs.detail(orgId),
    queryFn: () => apiRequest<OrgSummary>(`/orgs/${orgId}`),
    enabled: !!orgId,
  })

  return {
    org: data ?? null,
    loading: isLoading,
    isOwner: data?.role === "owner",
    notFound: isError,
  }
}
