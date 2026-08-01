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
