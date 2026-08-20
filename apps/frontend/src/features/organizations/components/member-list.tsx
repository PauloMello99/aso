"use client";

import { useEffect, useState } from "react";
import {
  MoreHorizontal,
  UserMinus,
  ShieldCheck,
  Power,
  SlidersHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils";
import { MODULE_KEYS, type ModuleKey } from "@/features/dashboard/lib/nav";
import {
  COMMISSION_MODE_LABELS,
  commissionErrorMessage,
  commissionItemSchema,
  type CommissionMode,
  type MemberCommission,
} from "@/features/cashier";
import type { Member, Invitation, OrgRole } from "../types";

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Proprietário",
  employee: "Funcionário",
};

const MODULE_LABEL: Record<ModuleKey, string> = {
  services: "Serviços",
  clients: "Clientes",
  schedule: "Agenda",
  stock: "Estoque",
  cashier: "Caixa",
};

interface MemberListProps {
  members: Member[];
  invitations: Invitation[];
  currentUserEmail: string;
  isOwner: boolean;
  onUpdateRole: (memberId: string, role: OrgRole) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  onToggleStatus: (memberId: string, enabled: boolean) => Promise<void>;
  onUpdatePermissions: (
    memberId: string,
    permissions: string[],
  ) => Promise<void>;
  onCancelInvitation: (invitationId: string) => Promise<void>;
  commissions: MemberCommission[];
  commissionsLoading: boolean;
  commissionsError: string | null;
  onUpdateCommission: (
    userId: string,
    percent: string,
    mode: CommissionMode,
  ) => Promise<void>;
}

const commissionFieldsSchema = commissionItemSchema.omit({ userId: true });

export function MemberList({
  members,
  invitations,
  currentUserEmail,
  isOwner,
  onUpdateRole,
  onRemove,
  onToggleStatus,
  onUpdatePermissions,
  onCancelInvitation,
  commissions,
  commissionsLoading,
  commissionsError,
  onUpdateCommission,
}: MemberListProps) {
  const [roleDialog, setRoleDialog] = useState<{
    member: Member;
    role: OrgRole;
  } | null>(null);
  const [removeDialog, setRemoveDialog] = useState<Member | null>(null);
  const [permsDialog, setPermsDialog] = useState<Member | null>(null);
  const [permsDraft, setPermsDraft] = useState<string[]>([]);
  const [commissionPercent, setCommissionPercent] = useState("");
  const [commissionMode, setCommissionMode] = useState<CommissionMode>("gross");
  const [commissionWasConfigured, setCommissionWasConfigured] = useState(false);
  const [commissionTouched, setCommissionTouched] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [permsSubmitError, setPermsSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openPerms(member: Member) {
    setPermsDraft(member.permissions ?? []);
    const existing = commissions.find((c) => c.userId === member.userId);
    setCommissionPercent(existing?.configured ? existing.percent : "");
    setCommissionMode(existing?.mode ?? "gross");
    setCommissionWasConfigured(existing?.configured ?? false);
    setCommissionTouched(false);
    setCommissionError(null);
    setPermsSubmitError(null);
    setPermsDialog(member);
  }

  // Os campos de comissão só são semeados no clique (openPerms). Se `commissions`
  // ainda não tinha carregado nesse momento, os campos ficavam presos no estado
  // inicial (placeholder vazio) mesmo depois do dado chegar. Re-semeia quando os
  // dados mudam, mas só enquanto o owner não tiver mexido no campo — não queremos
  // sobrescrever uma edição em andamento.
  const permsDialogUserId = permsDialog?.userId;
  useEffect(() => {
    if (!permsDialogUserId) return;
    const existing = commissions.find((c) => c.userId === permsDialogUserId);
    // `commissionWasConfigured` reflete o fato de existir (ou não) uma comissão
    // ativa no servidor — precisa sempre acompanhar `commissions`, mesmo que o
    // owner já tenha editado o percentual, senão o guard de "comissão fantasma"
    // em confirmPerms pode achar que nunca existiu configuração e silenciosamente
    // deixar de zerar uma comissão que ainda está ativa no banco.
    setCommissionWasConfigured(existing?.configured ?? false);
    if (commissionTouched) return;
    setCommissionPercent(existing?.configured ? existing.percent : "");
    setCommissionMode(existing?.mode ?? "gross");
  }, [commissions, permsDialogUserId, commissionTouched]);

  function togglePerm(module: ModuleKey, on: boolean) {
    setPermsDraft((prev) =>
      on ? [...new Set([...prev, module])] : prev.filter((m) => m !== module),
    );
  }

  function handleCommissionPercentChange(value: string) {
    setCommissionTouched(true);
    setCommissionPercent(value);
    const result = commissionFieldsSchema.safeParse({
      percent: value,
      mode: commissionMode,
    });
    setCommissionError(
      result.success
        ? null
        : (result.error.issues[0]?.message ?? "Percentual inválido"),
    );
  }

  function handleCommissionModeChange(mode: CommissionMode) {
    setCommissionTouched(true);
    setCommissionMode(mode);
  }

  async function confirmPerms() {
    if (!permsDialog) return;
    if (commissionError) return;
    setLoading(true);
    setPermsSubmitError(null);
    try {
      let permissionsSaved = false;
      if (permsDialog.role === "employee") {
        try {
          await onUpdatePermissions(permsDialog.memberId, permsDraft);
          permissionsSaved = true;
        } catch (err) {
          setPermsSubmitError(
            err instanceof Error
              ? err.message
              : "Não foi possível salvar as permissões.",
          );
          return;
        }
      }

      const trimmedPercent = commissionPercent.trim();
      // Só grava comissão se o campo foi preenchido ou já existia config prévia —
      // evita criar uma comissão fantasma em 0% para quem nunca teve nenhuma.
      if (trimmedPercent !== "" || commissionWasConfigured) {
        try {
          await onUpdateCommission(
            permsDialog.userId,
            trimmedPercent === "" ? "0" : trimmedPercent.replace(",", "."),
            commissionMode,
          );
        } catch (err) {
          const mapped = commissionErrorMessage(err);
          setPermsSubmitError(
            permissionsSaved
              ? `Permissões salvas, mas não foi possível salvar a comissão: ${mapped}`
              : mapped,
          );
          return;
        }
      }

      setPermsDialog(null);
    } finally {
      setLoading(false);
    }
  }

  async function confirmRoleChange() {
    if (!roleDialog) return;
    setLoading(true);
    try {
      await onUpdateRole(roleDialog.member.memberId, roleDialog.role);
      setRoleDialog(null);
    } finally {
      setLoading(false);
    }
  }

  async function confirmRemove() {
    if (!removeDialog) return;
    setLoading(true);
    try {
      await onRemove(removeDialog.memberId);
      setRemoveDialog(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="mb-3 text-sm font-medium text-foreground/50 uppercase tracking-wide">
          Membros ({members.length})
        </h3>

        <div className="rounded-xl border border-border-subtle">
          {members.map((member, i) => {
            const isSelf = member.userEmail === currentUserEmail;
            return (
              <div
                key={member.memberId}
                className={cn(
                  "flex items-center gap-3 p-3 sm:px-4",
                  i < members.length - 1 && "border-b border-border-subtle",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold uppercase text-primary-text sm:h-9 sm:w-9">
                  {member.userName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.userName}
                    {isSelf && (
                      <span className="ml-1 text-xs text-foreground/30">
                        (você)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-foreground/50">
                    {member.userEmail}
                  </p>
                </div>
                {!member.enabled && (
                  <Badge
                    variant="ghost"
                    className="shrink-0 bg-surface-2 text-text-muted"
                  >
                    Suspenso
                  </Badge>
                )}
                <Badge
                  variant={member.role === "owner" ? "brand" : "secondary"}
                  className="shrink-0"
                >
                  {ROLE_LABEL[member.role]}
                </Badge>
                {isOwner && !isSelf && (
                  <MemberActions
                    member={member}
                    onChangeRole={(role) => setRoleDialog({ member, role })}
                    onRemove={() => setRemoveDialog(member)}
                    onToggleStatus={() =>
                      onToggleStatus(member.memberId, !member.enabled)
                    }
                    onPermissions={() => openPerms(member)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {invitations.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-foreground/50 uppercase tracking-wide">
            Convites pendentes ({invitations.length})
          </h3>
          <div className="grid gap-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/20 text-foreground/30">
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{inv.email}</p>
                  <p className="text-xs text-foreground/40">
                    {ROLE_LABEL[inv.role]} · expira{" "}
                    {new Date(inv.expiresAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive/80"
                    onClick={() => onCancelInvitation(inv.id)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <Dialog
        open={!!roleDialog}
        onOpenChange={(v) => !v && setRoleDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar função</DialogTitle>
            <DialogDescription>
              Altere a função de{" "}
              <span className="font-medium text-foreground">
                {roleDialog?.member.userName}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Nova função</Label>
            <Select
              value={roleDialog?.role}
              onValueChange={(v) =>
                roleDialog &&
                setRoleDialog({ ...roleDialog, role: v as OrgRole })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Funcionário</SelectItem>
                <SelectItem value="owner">Proprietário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={loading}
              onClick={confirmRoleChange}
              className="w-full sm:w-auto"
            >
              {loading ? "Salvando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!permsDialog}
        onOpenChange={(v) => !v && setPermsDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            {permsDialog?.role === "owner" ? (
              <>
                <DialogTitle>Comissão</DialogTitle>
                <DialogDescription>
                  Configure o percentual de repasse de{" "}
                  <span className="font-medium text-foreground">
                    {permsDialog?.userName}
                  </span>
                  .
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle>Permissões do funcionário</DialogTitle>
                <DialogDescription>
                  Escolha os módulos que{" "}
                  <span className="font-medium text-foreground">
                    {permsDialog?.userName}
                  </span>{" "}
                  pode acessar. Em cada módulo, o funcionário vê apenas os
                  próprios registros.
                </DialogDescription>
              </>
            )}
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-5 overflow-y-auto pr-1">
            {permsDialog?.role === "employee" && (
              <div className="grid gap-1">
                {MODULE_KEYS.map((module) => {
                  const on = permsDraft.includes(module);
                  return (
                    <label
                      key={module}
                      className="flex items-center justify-between gap-4 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2.5"
                    >
                      <span className="text-sm text-foreground">
                        {MODULE_LABEL[module]}
                      </span>
                      <Switch
                        checked={on}
                        onCheckedChange={(v) => togglePerm(module, v)}
                      />
                    </label>
                  );
                })}
              </div>
            )}

            <div className="grid gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3">
              <p className="text-xs text-foreground/50">
                Comissão apenas informativa: o sistema não movimenta dinheiro,
                só calcula e exibe o valor de referência a repassar.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Percentual (%)</Label>
                  <Input
                    placeholder={commissionsLoading ? "Carregando…" : "0,00"}
                    inputMode="decimal"
                    autoComplete="off"
                    disabled={commissionsLoading || !!commissionsError}
                    value={commissionPercent}
                    onChange={(e) =>
                      handleCommissionPercentChange(e.target.value)
                    }
                  />
                  {commissionError && (
                    <p className="text-xs text-destructive">
                      {commissionError}
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label>Base de cálculo</Label>
                  <Select
                    value={commissionMode}
                    onValueChange={(v) =>
                      handleCommissionModeChange(v as CommissionMode)
                    }
                    disabled={commissionsLoading || !!commissionsError}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gross">
                        {COMMISSION_MODE_LABELS.gross}
                      </SelectItem>
                      <SelectItem value="net">
                        {COMMISSION_MODE_LABELS.net}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {commissionsError && (
                <p className="text-sm text-destructive">{commissionsError}</p>
              )}
            </div>

            {permsSubmitError && (
              <p className="text-sm text-destructive">{permsSubmitError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={
                loading ||
                commissionsLoading ||
                !!commissionError ||
                (permsDialog?.role === "owner" &&
                  (!!commissionsError ||
                    (commissionPercent.trim() === "" &&
                      !commissionWasConfigured)))
              }
              onClick={confirmPerms}
              className="w-full sm:w-auto"
            >
              {loading
                ? "Salvando…"
                : permsDialog?.role === "owner"
                  ? "Salvar comissão"
                  : "Salvar permissões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!removeDialog}
        onOpenChange={(v) => !v && setRemoveDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover membro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{" "}
              <span className="font-medium text-foreground">
                {removeDialog?.userName}
              </span>{" "}
              da organização?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={confirmRemove}
              className="w-full sm:w-auto"
            >
              {loading ? "Removendo…" : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberActions({
  member,
  onChangeRole,
  onRemove,
  onToggleStatus,
  onPermissions,
}: {
  member: Member;
  onChangeRole: (role: OrgRole) => void;
  onRemove: () => void;
  onToggleStatus: () => void;
  onPermissions: () => void;
}) {
  const nextRole: OrgRole = member.role === "owner" ? "employee" : "owner";
  const nextRoleLabel =
    nextRole === "owner" ? "Tornar proprietário" : "Tornar funcionário";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onPermissions}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Permissões
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeRole(nextRole)}>
          <ShieldCheck className="mr-2 h-4 w-4" />
          {nextRoleLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleStatus}>
          <Power className="mr-2 h-4 w-4" />
          {member.enabled ? "Desativar" : "Ativar"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onRemove}
        >
          <UserMinus className="mr-2 h-4 w-4" />
          Remover
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
