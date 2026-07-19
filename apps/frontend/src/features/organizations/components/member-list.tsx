"use client"

import { useState } from "react"
import {
  MoreHorizontal,
  UserMinus,
  ShieldCheck,
  Power,
  SlidersHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { MODULE_KEYS, type ModuleKey } from "@/features/dashboard/lib/nav"
import type { Member, Invitation, OrgRole } from "../types"

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Proprietário",
  employee: "Funcionário",
}

const MODULE_LABEL: Record<ModuleKey, string> = {
  services: "Serviços",
  clients: "Clientes",
  schedule: "Agenda",
  stock: "Estoque",
  cashier: "Caixa",
}

interface MemberListProps {
  members: Member[]
  invitations: Invitation[]
  currentUserEmail: string
  isOwner: boolean
  onUpdateRole: (memberId: string, role: OrgRole) => Promise<void>
  onRemove: (memberId: string) => Promise<void>
  onToggleStatus: (memberId: string, enabled: boolean) => Promise<void>
  onUpdatePermissions: (memberId: string, permissions: string[]) => Promise<void>
  onCancelInvitation: (invitationId: string) => Promise<void>
}

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
}: MemberListProps) {
  const [roleDialog, setRoleDialog] = useState<{ member: Member; role: OrgRole } | null>(null)
  const [removeDialog, setRemoveDialog] = useState<Member | null>(null)
  const [permsDialog, setPermsDialog] = useState<Member | null>(null)
  const [permsDraft, setPermsDraft] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function openPerms(member: Member) {
    setPermsDraft(member.permissions ?? [])
    setPermsDialog(member)
  }

  function togglePerm(module: ModuleKey, on: boolean) {
    setPermsDraft((prev) =>
      on ? [...new Set([...prev, module])] : prev.filter((m) => m !== module),
    )
  }

  async function confirmPerms() {
    if (!permsDialog) return
    setLoading(true)
    try {
      await onUpdatePermissions(permsDialog.memberId, permsDraft)
      setPermsDialog(null)
    } finally {
      setLoading(false)
    }
  }

  async function confirmRoleChange() {
    if (!roleDialog) return
    setLoading(true)
    try {
      await onUpdateRole(roleDialog.member.memberId, roleDialog.role)
      setRoleDialog(null)
    } finally {
      setLoading(false)
    }
  }

  async function confirmRemove() {
    if (!removeDialog) return
    setLoading(true)
    try {
      await onRemove(removeDialog.memberId)
      setRemoveDialog(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="mb-3 text-sm font-medium text-foreground/50 uppercase tracking-wide">
          Membros ({members.length})
        </h3>

        <div className="hidden sm:block overflow-hidden rounded-lg border border-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-foreground/[0.02] hover:bg-transparent">
                <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">Nome</TableHead>
                <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">E-mail</TableHead>
                <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">Função</TableHead>
                <TableHead className="w-12 px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isSelf = member.userEmail === currentUserEmail
                return (
                  <TableRow key={member.memberId}>
                    <TableCell className="px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold uppercase">
                          {member.userName.charAt(0)}
                        </div>
                        <span className="font-medium">
                          {member.userName}
                          {isSelf && (
                            <span className="ml-2 text-xs text-foreground/30">(você)</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-foreground/60">{member.userEmail}</TableCell>
                    <TableCell className="px-4">
                      <span
                        className={
                          member.role === "owner"
                            ? "inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            : "inline-flex items-center rounded-md bg-foreground/5 px-2 py-0.5 text-xs font-medium text-foreground/50"
                        }
                      >
                        {ROLE_LABEL[member.role]}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
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
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-2 sm:hidden">
          {members.map((member) => {
            const isSelf = member.userEmail === currentUserEmail
            return (
              <div
                key={member.memberId}
                className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold uppercase">
                  {member.userName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.userName}
                    {isSelf && <span className="ml-1 text-xs text-foreground/30">(você)</span>}
                  </p>
                  <p className="truncate text-xs text-foreground/50">{member.userEmail}</p>
                </div>
                <span
                  className={
                    member.role === "owner"
                      ? "shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      : "shrink-0 rounded-md bg-foreground/5 px-2 py-0.5 text-xs font-medium text-foreground/50"
                  }
                >
                  {ROLE_LABEL[member.role]}
                </span>
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
            )
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

      <Dialog open={!!roleDialog} onOpenChange={(v) => !v && setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar função</DialogTitle>
            <DialogDescription>
              Altere a função de{" "}
              <span className="font-medium text-foreground">{roleDialog?.member.userName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Nova função</Label>
            <Select
              value={roleDialog?.role}
              onValueChange={(v) =>
                roleDialog && setRoleDialog({ ...roleDialog, role: v as OrgRole })
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

      <Dialog open={!!permsDialog} onOpenChange={(v) => !v && setPermsDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões do funcionário</DialogTitle>
            <DialogDescription>
              Escolha os módulos que{" "}
              <span className="font-medium text-foreground">
                {permsDialog?.userName}
              </span>{" "}
              pode acessar. Em cada módulo, o funcionário vê apenas os próprios
              registros.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1">
            {MODULE_KEYS.map((module) => {
              const on = permsDraft.includes(module)
              return (
                <label
                  key={module}
                  className="flex items-center justify-between gap-4 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2.5"
                >
                  <span className="text-sm text-foreground">{MODULE_LABEL[module]}</span>
                  <Switch
                    checked={on}
                    onCheckedChange={(v) => togglePerm(module, v)}
                  />
                </label>
              )
            })}
          </div>
          <DialogFooter>
            <Button
              disabled={loading}
              onClick={confirmPerms}
              className="w-full sm:w-auto"
            >
              {loading ? "Salvando…" : "Salvar permissões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeDialog} onOpenChange={(v) => !v && setRemoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover membro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{" "}
              <span className="font-medium text-foreground">{removeDialog?.userName}</span> da
              organização?
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
  )
}

function MemberActions({
  member,
  onChangeRole,
  onRemove,
  onToggleStatus,
  onPermissions,
}: {
  member: Member
  onChangeRole: (role: OrgRole) => void
  onRemove: () => void
  onToggleStatus: () => void
  onPermissions: () => void
}) {
  const nextRole: OrgRole = member.role === "owner" ? "employee" : "owner"
  const nextRoleLabel = nextRole === "owner" ? "Tornar proprietário" : "Tornar funcionário"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {member.role === "employee" && (
          <DropdownMenuItem onClick={onPermissions}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Permissões
          </DropdownMenuItem>
        )}
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
  )
}
