"use client"

import { useState } from "react"
import { useRouter } from "next/router"
import { UserPlus, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useOrg } from "@/features/dashboard/hooks/use-orgs"
import { useMembers } from "../hooks/use-members"
import { MemberList } from "./member-list"
import { InviteMemberForm } from "./invite-member-form"
import type { InviteFormValues } from "../schemas/org.schemas"
import type { OrgRole } from "../types"

export function MembersPage() {
  const router = useRouter()
  const { orgId } = router.query as { orgId?: string }
  const [inviteOpen, setInviteOpen] = useState(false)

  const { user } = useAuth()
  const { isOwner } = useOrg(orgId ?? "")
  const {
    members,
    invitations,
    loading,
    error,
    inviteMember,
    updateMemberRole: updateMemberRoleFn,
    removeMember,
    cancelInvitation,
  } = useMembers(orgId ?? "")

  async function updateMemberRole(memberId: string, role: OrgRole): Promise<void> {
    await updateMemberRoleFn(memberId, role)
  }

  async function handleInvite(values: InviteFormValues) {
    await inviteMember(values.email, values.role as OrgRole)
  }

  if (!orgId) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando membros…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Membros</h2>
          <p className="text-sm text-white/50">Gerencie quem tem acesso a esta organização.</p>
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

      <MemberList
        members={members}
        invitations={invitations}
        currentUserEmail={user?.email ?? ""}
        isOwner={isOwner}
        onUpdateRole={updateMemberRole}
        onRemove={removeMember}
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
