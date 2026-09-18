"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { Loader2, AlertCircle, UserPlus } from "lucide-react";
import { useOrg } from "@/features/dashboard/hooks/use-orgs";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useMemberCommissions,
  useMemberPaymentFees,
} from "@/features/cashier";
import { Button } from "@/shared/components/ui/button";
import { useMembers } from "../hooks/use-members";
import { MemberList } from "./member-list";
import { InviteMemberForm } from "./invite-member-form";
import type { InviteFormValues } from "../schemas/org.schemas";
import type { Member, OrgRole } from "../types";

interface MembersPageProps {
  orgId: string;
}

export function MembersPage({ orgId }: MembersPageProps) {
  const router = useRouter();
  const { org, loading, isOwner, notFound } = useOrg(orgId);
  const { user } = useAuth();
  const {
    members,
    invitations,
    error: membersError,
    inviteMember,
    updateMemberRole,
    removeMember,
    setMemberStatus,
    updateMemberPermissions,
    updateMemberClassification,
    cancelInvitation,
  } = useMembers(orgId, isOwner);
  // Comissão/taxa por membro é dado do módulo `cashier` (guarda por
  // `OrgModuleGuard` no backend) — só busca para owner, que sempre tem acesso;
  // funcionário nunca vê o menu de ações que usaria esse dado, e buscar sem
  // permissão de módulo só geraria 403 desnecessário a cada carga da página.
  const {
    commissions,
    loading: commissionsLoading,
    error: commissionsError,
    upsertCommissions,
  } = useMemberCommissions(orgId, isOwner);
  const {
    memberFees,
    loading: memberFeesLoading,
    error: memberFeesError,
    updateMemberFees,
  } = useMemberPaymentFees(orgId, isOwner);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Organização não encontrada.
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {membersError}
      </div>
    );
  }

  const currentUserEmail = user?.email ?? "";
  // Funcionário só vê a própria linha (casado por e-mail, mesmo critério que
  // já identifica "você" na lista) — sem visão dos demais membros nem dos
  // convites pendentes, que são uma ação de gestão do owner.
  const visibleMembers = isOwner
    ? members
    : members.filter((m) => m.userEmail === currentUserEmail);
  const orgSlug = org.slug;

  async function handleInvite(values: InviteFormValues) {
    await inviteMember(values.email, values.role as OrgRole);
  }

  function openMember(member: Member) {
    void router.push(`/dashboard/org/${orgSlug}/members/${member.userId}`);
  }

  return (
    <div className="grid gap-8">
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Membros</h1>
            <p className="mt-0.5 text-sm text-foreground/40">
              Gerencie quem tem acesso a esta organização.
            </p>
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
          members={visibleMembers}
          invitations={isOwner ? invitations : []}
          currentUserEmail={currentUserEmail}
          isOwner={isOwner}
          onOpenMember={openMember}
          onUpdateRole={async (memberId, role) => {
            await updateMemberRole(memberId, role);
          }}
          onRemove={removeMember}
          onToggleStatus={async (memberId, enabled) => {
            await setMemberStatus(memberId, enabled);
          }}
          onUpdatePermissions={async (memberId, permissions) => {
            await updateMemberPermissions(memberId, permissions);
          }}
          onUpdateClassification={async (memberId, classification) => {
            await updateMemberClassification(memberId, classification);
          }}
          onCancelInvitation={cancelInvitation}
          commissions={commissions}
          commissionsLoading={commissionsLoading}
          commissionsError={commissionsError}
          onUpdateCommission={async (userId, percent, mode) => {
            await upsertCommissions([{ userId, percent, mode }]);
          }}
          memberFees={memberFees}
          memberFeesLoading={memberFeesLoading}
          memberFeesError={memberFeesError}
          onUpdateMemberFees={async (payload) => {
            await updateMemberFees(payload);
          }}
        />

        <InviteMemberForm
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onSubmit={handleInvite}
        />
      </section>
    </div>
  );
}
