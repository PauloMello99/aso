"use client"

import { useState } from "react"
import { UserPlus, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useCurrentOrg } from "@/features/dashboard"
import { useMembers } from "../hooks/use-members"
import { MemberList } from "./member-list"
import { InviteMemberForm } from "./invite-member-form"
import type { InviteFormValues } from "../schemas/org.schemas"
import type { OrgRole } from "../types"

export function MembersPage() {
  const { org, orgId } = useCurrentOrg()
  const isOwner = org.role === "owner"
  const [inviteOpen, setInviteOpen] = useState(false)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)

  const { user } = useAuth()
  const {
    members,
    invitations,
    loading,
    error,
    inviteMember,
    updateMemberRole: updateMemberRoleFn,
    removeMember,
    setMemberStatus,
    updateMemberPermissions,
    cancelInvitation,
  } = useMembers(orgId)

  async function handleUpdatePermissions(
    memberId: string,
    permissions: string[],
  ): Promise<void> {
    try {
      await updateMemberPermissions(memberId, permissions)
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar as permissões.",
      )
    }
  }

  async function updateMemberRole(memberId: string, role: OrgRole): Promise<void> {
    await updateMemberRoleFn(memberId, role)
  }

  async function toggleStatus(memberId: string, enabled: boolean): Promise<void> {
    try {
      await setMemberStatus(memberId, enabled)
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar o status do membro.",
      )
    }
  }

  async function handleInvite(values: InviteFormValues) {
    const result = await inviteMember(values.email, values.role as OrgRole)
    setLastInviteUrl(result.acceptUrl)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando membros…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl grid gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Membros</h2>
          <p className="text-sm text-foreground/40">Gerencie quem tem acesso a esta organização.</p>
        </div>
        {isOwner && (
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Convidar
          </Button>
        )}
      </div>

      {lastInviteUrl && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <span className="text-foreground/70">
            Convite criado. Link de aceite (dev — copie para testar):
          </span>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={lastInviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-foreground/[0.08] bg-foreground/[0.04] px-2 py-1 text-xs text-foreground/80"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void navigator.clipboard?.writeText(lastInviteUrl)}
            >
              Copiar
            </Button>
          </div>
        </div>
      )}

      <MemberList
        members={members}
        invitations={invitations}
        currentUserEmail={user?.email ?? ""}
        isOwner={isOwner}
        onUpdateRole={updateMemberRole}
        onRemove={removeMember}
        onToggleStatus={toggleStatus}
        onUpdatePermissions={handleUpdatePermissions}
        onCancelInvitation={cancelInvitation}
      />

      <InviteMemberForm
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={handleInvite}
      />
    </div>
  )
}
