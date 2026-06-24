"use client"

import { useState } from "react"
import { useRouter } from "next/router"
import { Loader2, AlertCircle, UserPlus } from "lucide-react"
import { useOrg } from "@/features/dashboard/hooks/use-orgs"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { Button } from "@/shared/components/ui/button"
import { useOrgMutations } from "../hooks/use-org-mutations"
import { useMembers } from "../hooks/use-members"
import { EditOrgForm } from "./edit-org-form"
import { DeleteOrgDialog } from "./delete-org-dialog"
import { TransferOrgDialog } from "./transfer-org-dialog"
import { MemberList } from "./member-list"
import { InviteMemberForm } from "./invite-member-form"
import type { UpdateOrgFormValues, InviteFormValues } from "../schemas/org.schemas"
import type { OrgRole } from "../types"

interface OrgSettingsPageProps {
  orgId: string
}

export function OrgSettingsPage({ orgId }: OrgSettingsPageProps) {
  const router = useRouter()
  const { org, loading, isOwner, notFound } = useOrg(orgId)
  const { updateOrg, deleteOrg, transferOwnership } = useOrgMutations(orgId)
  const { user } = useAuth()
  const { members, invitations, inviteMember, updateMemberRole, removeMember, setMemberStatus, updateMemberPermissions, cancelInvitation } =
    useMembers(orgId)
  const [inviteOpen, setInviteOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando…
      </div>
    )
  }

  if (notFound || !org) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Organização não encontrada.
      </div>
    )
  }

  async function handleUpdate(values: UpdateOrgFormValues) {
    await updateOrg(values)
  }

  async function handleDelete() {
    await deleteOrg()
    await router.push("/dashboard/organizations")
  }

  async function handleInvite(values: InviteFormValues) {
    await inviteMember(values.email, values.role as OrgRole)
  }

  return (
    <div className="grid gap-10">
      {/* General info */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Informações gerais</h2>
          <p className="text-sm text-white/50">Nome e identificador público da organização.</p>
        </div>

        {isOwner ? (
          <div>
            <EditOrgForm org={org} onSubmit={handleUpdate} />
          </div>
        ) : (
          <div className="grid max-w-lg gap-3">
            <div className="grid gap-1">
              <span className="text-xs text-white/40">Nome</span>
              <span className="font-medium">{org.name}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-xs text-white/40">Slug</span>
              <span className="font-mono text-sm text-white/70">/{org.slug}</span>
            </div>
          </div>
        )}
      </section>

      {/* Members */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Membros</h2>
            <p className="text-sm text-white/50">Gerencie quem tem acesso a esta organização.</p>
          </div>
          {isOwner && (
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setInviteOpen(true)}>
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
          onUpdateRole={async (memberId, role) => {
            await updateMemberRole(memberId, role)
          }}
          onRemove={removeMember}
          onToggleStatus={async (memberId, enabled) => {
            await setMemberStatus(memberId, enabled)
          }}
          onUpdatePermissions={async (memberId, permissions) => {
            await updateMemberPermissions(memberId, permissions)
          }}
          onCancelInvitation={cancelInvitation}
        />

        <InviteMemberForm
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onSubmit={handleInvite}
        />
      </section>

      {/* Transfer organization — owner only */}
      {isOwner && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Transferir Organização</h2>
            <p className="text-sm text-white/50">
              Transfira a propriedade desta organização para outro membro.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/50">
                A titularidade passa para o membro escolhido. Você se torna
                funcionário com acesso total aos módulos.
              </p>
              <TransferOrgDialog
                members={members}
                currentUserEmail={user?.email ?? ""}
                onConfirm={async (memberId) => {
                  await transferOwnership(memberId)
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Danger zone — owner only */}
      {isOwner && (
        <section>
          <div className="rounded-lg border border-red-500/20 p-4 sm:p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-red-400">Zona de perigo</h3>
              <p className="mt-1 text-sm text-white/50">Ações irreversíveis. Prossiga com cautela.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Excluir organização</p>
                <p className="text-xs text-white/40">
                  Remove permanentemente todos os dados desta organização.
                </p>
              </div>
              <DeleteOrgDialog org={org} onConfirm={handleDelete} />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
