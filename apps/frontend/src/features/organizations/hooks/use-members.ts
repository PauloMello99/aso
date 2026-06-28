"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Member, Invitation, InviteResult, OrgRole } from "../types"

export function useMembers(orgId: string) {
  const queryClient = useQueryClient()

  // ── Queries ────────────────────────────────────────────────────────────────

  const membersQuery = useQuery({
    queryKey: queryKeys.members.list(orgId),
    queryFn: () => apiRequest<Member[]>(`/orgs/${orgId}/members`),
    enabled: !!orgId,
  })

  const invitationsQuery = useQuery({
    queryKey: queryKeys.members.invitations(orgId),
    queryFn: () =>
      apiRequest<Invitation[]>(`/orgs/${orgId}/invitations`).catch(
        () => [] as Invitation[],
      ),
    enabled: !!orgId,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const inviteMemberMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: OrgRole }) =>
      apiRequest<InviteResult>(`/orgs/${orgId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.invitations(orgId) })
    },
  })

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: OrgRole }) =>
      apiRequest<Member>(`/orgs/${orgId}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(orgId) })
    },
  })

  const updateMemberPermissionsMutation = useMutation({
    mutationFn: ({
      memberId,
      permissions,
    }: {
      memberId: string
      permissions: string[]
    }) =>
      apiRequest<Member>(`/orgs/${orgId}/members/${memberId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(orgId) })
      // permissões afetam o nav/escopo do próprio funcionário → invalida orgs também.
      void queryClient.invalidateQueries({ queryKey: queryKeys.orgs.all })
    },
  })

  const setMemberStatusMutation = useMutation({
    mutationFn: ({ memberId, enabled }: { memberId: string; enabled: boolean }) =>
      apiRequest<Member>(`/orgs/${orgId}/members/${memberId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(orgId) })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiRequest<void>(`/orgs/${orgId}/members/${memberId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(orgId) })
    },
  })

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      apiRequest<void>(`/orgs/${orgId}/invitations/${invitationId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.invitations(orgId) })
    },
  })

  // ── Stable wrappers (unchanged call signature for consumers) ───────────────

  async function inviteMember(email: string, role: OrgRole): Promise<InviteResult> {
    return inviteMemberMutation.mutateAsync({ email, role })
  }

  async function updateMemberRole(memberId: string, role: OrgRole): Promise<Member> {
    return updateMemberRoleMutation.mutateAsync({ memberId, role })
  }

  async function removeMember(memberId: string): Promise<void> {
    return removeMemberMutation.mutateAsync(memberId)
  }

  async function setMemberStatus(
    memberId: string,
    enabled: boolean,
  ): Promise<Member> {
    return setMemberStatusMutation.mutateAsync({ memberId, enabled })
  }

  async function updateMemberPermissions(
    memberId: string,
    permissions: string[],
  ): Promise<Member> {
    return updateMemberPermissionsMutation.mutateAsync({ memberId, permissions })
  }

  async function cancelInvitation(invitationId: string): Promise<void> {
    return cancelInvitationMutation.mutateAsync(invitationId)
  }

  return {
    members: membersQuery.data ?? [],
    invitations: invitationsQuery.data ?? [],
    loading: membersQuery.isLoading,
    error: membersQuery.error instanceof Error ? membersQuery.error.message : null,
    refetch: () =>
      Promise.all([membersQuery.refetch(), invitationsQuery.refetch()]),
    inviteMember,
    updateMemberRole,
    removeMember,
    setMemberStatus,
    updateMemberPermissions,
    cancelInvitation,
  }
}
