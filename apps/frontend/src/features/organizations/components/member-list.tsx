"use client";

import { useEffect, useState } from "react";
import {
  MoreHorizontal,
  UserMinus,
  ShieldCheck,
  Power,
  SlidersHorizontal,
  Percent,
  CreditCard,
  Tag,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";
import { MODULE_KEYS, type ModuleKey } from "@/features/dashboard/lib/nav";
import {
  COMMISSION_MODE_LABELS,
  MAX_INSTALLMENTS,
  commissionErrorMessage,
  commissionItemSchema,
  memberFeesSchema,
  type CommissionMode,
  type MemberCommission,
  type FeeEligibleMethod,
  type FeeSource,
  type MemberPaymentFee,
  type MemberPaymentFeeInput,
  type MemberPaymentFeeDeactivation,
  type MemberPaymentFeesUpdate,
} from "@/features/cashier";
import {
  centsToReaisInput,
  parseReaisToCents,
} from "@/features/cashier/lib/money";
import { MEMBER_CLASSIFICATION_LABELS } from "../types";
import type {
  Member,
  Invitation,
  MemberClassification,
  OrgRole,
} from "../types";

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
  onOpenMember: (member: Member) => void;
  onUpdateRole: (memberId: string, role: OrgRole) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  onToggleStatus: (memberId: string, enabled: boolean) => Promise<void>;
  onUpdatePermissions: (
    memberId: string,
    permissions: string[],
  ) => Promise<void>;
  onUpdateClassification: (
    memberId: string,
    classification: MemberClassification | null,
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
  memberFees: MemberPaymentFee[];
  memberFeesLoading: boolean;
  memberFeesError: string | null;
  onUpdateMemberFees: (payload: MemberPaymentFeesUpdate) => Promise<void>;
}

const commissionFieldsSchema = commissionItemSchema.omit({ userId: true });

// Mesma validação de percentual do diálogo de comissão (vazio permitido, 0–100).
const feePercentSchema = commissionItemSchema.shape.percent;

const FEE_METHOD_LABEL: Record<FeeEligibleMethod, string> = {
  credit_card: "Crédito",
  debit_card: "Débito",
};

// 13 linhas configuráveis do diálogo por-membro: 12 faixas de crédito
// (1..MAX_INSTALLMENTS, mesma constante/teto de payment-fees-form.tsx) + 1
// linha fixa de débito (installments sempre 1, não editável — CHECK do banco
// proíbe installments>1 fora de credit_card). Ordem fixa, usada para alinhar
// por índice com `feesRows`.
const CREDIT_CARD_INSTALLMENTS = Array.from(
  { length: MAX_INSTALLMENTS },
  (_, i) => i + 1,
);

interface FeeRow {
  paymentMethod: FeeEligibleMethod;
  installments: number;
}

const FEE_ROWS: FeeRow[] = [
  ...CREDIT_CARD_INSTALLMENTS.map((installments) => ({
    paymentMethod: "credit_card" as const,
    installments,
  })),
  { paymentMethod: "debit_card" as const, installments: 1 },
];

function feeRowLabel(paymentMethod: FeeEligibleMethod, installments: number) {
  if (paymentMethod === "debit_card") return FEE_METHOD_LABEL.debit_card;
  return installments === 1
    ? "Crédito 1x (à vista)"
    : `Crédito ${installments}x`;
}

interface FeeRowState extends FeeRow {
  percent: string;
  fixed: string;
  // Placeholders (taxa herdada da org para esta faixa); vazio quando a org
  // também não configurou.
  inheritedPercent: string;
  inheritedFixed: string;
  configured: boolean;
  source: FeeSource;
}

function emptyFeeRows(): FeeRowState[] {
  return FEE_ROWS.map((entry) => ({
    ...entry,
    percent: "",
    fixed: "",
    inheritedPercent: "",
    inheritedFixed: "",
    configured: false,
    source: "none",
  }));
}

// Semeia o diálogo de taxa a partir das linhas planas de memberFees (uma por
// membro × método × faixa). Override próprio (source === "member") popula o
// campo editável; herança (org/none) vai só para o placeholder.
function computeFeeSeed(
  rows: MemberPaymentFee[],
  userId: string,
): FeeRowState[] {
  return FEE_ROWS.map((entry) => {
    const match = rows.find(
      (f) =>
        f.userId === userId &&
        f.paymentMethod === entry.paymentMethod &&
        f.installments === entry.installments,
    );
    if (!match) {
      return {
        ...entry,
        percent: "",
        fixed: "",
        inheritedPercent: "",
        inheritedFixed: "",
        configured: false,
        source: "none",
      };
    }
    const isOwn = match.source === "member";
    return {
      ...entry,
      percent: isOwn ? match.percent : "",
      fixed: isOwn ? centsToReaisInput(match.fixedCents) : "",
      inheritedPercent: isOwn ? "" : match.percent,
      inheritedFixed: isOwn ? "" : centsToReaisInput(match.fixedCents),
      configured: isOwn,
      source: match.source,
    };
  });
}

function feeFieldsError(rows: FeeRowState[]): string | null {
  for (const row of rows) {
    const percentResult = feePercentSchema.safeParse(row.percent);
    if (!percentResult.success) {
      const message =
        percentResult.error.issues[0]?.message ?? "Percentual inválido";
      return `${feeRowLabel(row.paymentMethod, row.installments)}: ${message}`;
    }
    if (row.fixed.trim() !== "" && Number.isNaN(parseReaisToCents(row.fixed))) {
      const label = feeRowLabel(row.paymentMethod, row.installments);
      return `${label}: Valor fixo inválido`;
    }
  }
  return null;
}

// Guard anti-override-fantasma (espelha confirmCommission): faixas preenchidas
// viram upsert em `fees`; faixas limpas que TINHAM override próprio viram
// `deactivations` (remove o override daquela faixa, volta ao fallback da org);
// faixas limpas e sem override prévio são omitidas dos dois — salvar sem
// preencher não cria taxa por membro em 0. Só as linhas TOCADAS entram no
// payload (delta), nunca as 13 — decisão do passo 8: aqui, ao contrário da
// tela de config da ORG, ausência de override já cai corretamente no
// fallback da organização.
function buildFeePayload(
  userId: string,
  rows: FeeRowState[],
): {
  fees: MemberPaymentFeeInput[];
  deactivations: MemberPaymentFeeDeactivation[];
} {
  const fees: MemberPaymentFeeInput[] = [];
  const deactivations: MemberPaymentFeeDeactivation[] = [];
  for (const row of rows) {
    const percent = row.percent.trim();
    const fixed = row.fixed.trim();
    if (percent === "" && fixed === "") {
      if (row.configured) {
        deactivations.push({
          userId,
          paymentMethod: row.paymentMethod,
          installments: row.installments,
        });
      }
      continue;
    }
    fees.push({
      userId,
      paymentMethod: row.paymentMethod,
      installments: row.installments,
      percent: percent === "" ? "0" : percent.replace(",", "."),
      fixedCents: fixed === "" ? 0 : parseReaisToCents(fixed),
    });
  }
  return { fees, deactivations };
}

export function MemberList({
  members,
  invitations,
  currentUserEmail,
  isOwner,
  onOpenMember,
  onUpdateRole,
  onRemove,
  onToggleStatus,
  onUpdatePermissions,
  onUpdateClassification,
  onCancelInvitation,
  commissions,
  commissionsLoading,
  commissionsError,
  onUpdateCommission,
  memberFees,
  memberFeesLoading,
  memberFeesError,
  onUpdateMemberFees,
}: MemberListProps) {
  const [roleDialog, setRoleDialog] = useState<{
    member: Member;
    role: OrgRole;
  } | null>(null);
  const [classificationDialog, setClassificationDialog] = useState<{
    member: Member;
    value: MemberClassification | "none";
  } | null>(null);
  const [removeDialog, setRemoveDialog] = useState<Member | null>(null);
  const [permsDialog, setPermsDialog] = useState<Member | null>(null);
  const [permsDraft, setPermsDraft] = useState<string[]>([]);
  const [commissionDialog, setCommissionDialog] = useState<Member | null>(null);
  const [commissionPercent, setCommissionPercent] = useState("");
  const [commissionMode, setCommissionMode] = useState<CommissionMode>("gross");
  const [commissionWasConfigured, setCommissionWasConfigured] = useState(false);
  const [commissionTouched, setCommissionTouched] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [permsSubmitError, setPermsSubmitError] = useState<string | null>(null);
  const [commissionSubmitError, setCommissionSubmitError] = useState<
    string | null
  >(null);
  const [feesDialog, setFeesDialog] = useState<Member | null>(null);
  const [feesRows, setFeesRows] = useState<FeeRowState[]>(emptyFeeRows);
  const [feesTouched, setFeesTouched] = useState(false);
  const [feesFieldError, setFeesFieldError] = useState<string | null>(null);
  const [feesSubmitError, setFeesSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openPerms(member: Member) {
    setPermsDraft(member.permissions ?? []);
    setPermsSubmitError(null);
    setPermsDialog(member);
  }

  function openCommission(member: Member) {
    const existing = commissions.find((c) => c.userId === member.userId);
    setCommissionPercent(existing?.configured ? existing.percent : "");
    setCommissionMode(existing?.mode ?? "gross");
    setCommissionWasConfigured(existing?.configured ?? false);
    setCommissionTouched(false);
    setCommissionError(null);
    setCommissionSubmitError(null);
    setCommissionDialog(member);
  }

  // Os campos de comissão só são semeados no clique (openCommission). Se
  // `commissions` ainda não tinha carregado nesse momento, os campos ficavam
  // presos no estado inicial (placeholder vazio) mesmo depois do dado chegar.
  // Re-semeia quando os dados mudam, mas só enquanto o owner não tiver mexido
  // no campo — não queremos sobrescrever uma edição em andamento.
  const commissionDialogUserId = commissionDialog?.userId;
  useEffect(() => {
    if (!commissionDialogUserId) return;
    const existing = commissions.find(
      (c) => c.userId === commissionDialogUserId,
    );
    // `commissionWasConfigured` reflete o fato de existir (ou não) uma comissão
    // ativa no servidor — precisa sempre acompanhar `commissions`, mesmo que o
    // owner já tenha editado o percentual, senão o guard de "comissão fantasma"
    // em confirmCommission pode achar que nunca existiu configuração e
    // silenciosamente deixar de zerar uma comissão que ainda está ativa no banco.
    setCommissionWasConfigured(existing?.configured ?? false);
    if (commissionTouched) return;
    setCommissionPercent(existing?.configured ? existing.percent : "");
    setCommissionMode(existing?.mode ?? "gross");
  }, [commissions, commissionDialogUserId, commissionTouched]);

  function openFees(member: Member) {
    setFeesRows(computeFeeSeed(memberFees, member.userId));
    setFeesTouched(false);
    setFeesFieldError(null);
    setFeesSubmitError(null);
    setFeesDialog(member);
  }

  // Mesma re-semeadura do diálogo de comissão: source/configured/inherited
  // sempre acompanham o servidor (o guard anti-fantasma depende de saber se havia
  // override próprio); os campos editáveis só re-semeiam enquanto o owner não
  // mexeu, para não descartar uma edição em andamento. `computeFeeSeed` sempre
  // itera FEE_ROWS na mesma ordem fixa, então a linha de índice `i` da nova
  // semeadura e a linha de índice `i` do draft anterior sempre representam a
  // mesma faixa (método + parcelas) — seguro alinhar por índice.
  const feesDialogUserId = feesDialog?.userId;
  useEffect(() => {
    if (!feesDialogUserId) return;
    const seedRows = computeFeeSeed(memberFees, feesDialogUserId);
    if (!feesTouched) {
      setFeesRows(seedRows);
      return;
    }
    setFeesRows((prev) =>
      seedRows.map((seedRow, i) => {
        const draftRow = prev[i];
        return draftRow
          ? { ...seedRow, percent: draftRow.percent, fixed: draftRow.fixed }
          : seedRow;
      }),
    );
  }, [memberFees, feesDialogUserId, feesTouched]);

  function handleFeeFieldChange(
    idx: number,
    field: "percent" | "fixed",
    value: string,
  ) {
    setFeesTouched(true);
    const next: FeeRowState[] = feesRows.map((row, i) =>
      i === idx ? { ...row, [field]: value } : row,
    );
    setFeesRows(next);
    setFeesFieldError(feeFieldsError(next));
  }

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
    setLoading(true);
    setPermsSubmitError(null);
    try {
      await onUpdatePermissions(permsDialog.memberId, permsDraft);
      setPermsDialog(null);
    } catch (err) {
      setPermsSubmitError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as permissões.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmCommission() {
    if (!commissionDialog) return;
    if (commissionError) return;
    setLoading(true);
    setCommissionSubmitError(null);
    try {
      const trimmedPercent = commissionPercent.trim();
      // Só grava comissão se o campo foi preenchido ou já existia config prévia —
      // evita criar uma comissão fantasma em 0% para quem nunca teve nenhuma.
      if (trimmedPercent !== "" || commissionWasConfigured) {
        try {
          await onUpdateCommission(
            commissionDialog.userId,
            trimmedPercent === "" ? "0" : trimmedPercent.replace(",", "."),
            commissionMode,
          );
        } catch (err) {
          setCommissionSubmitError(commissionErrorMessage(err));
          return;
        }
      }

      setCommissionDialog(null);
    } finally {
      setLoading(false);
    }
  }

  async function confirmFees() {
    if (!feesDialog) return;
    if (feesFieldError) return;
    setLoading(true);
    setFeesSubmitError(null);
    try {
      const { fees, deactivations } = buildFeePayload(
        feesDialog.userId,
        feesRows,
      );
      // Nada preenchido e nenhum override prévio: não chama a API.
      if (fees.length > 0 || deactivations.length > 0) {
        const parsed = memberFeesSchema.safeParse({ fees });
        if (!parsed.success) {
          setFeesFieldError(
            parsed.error.issues[0]?.message ?? "Dados inválidos",
          );
          return;
        }
        try {
          await onUpdateMemberFees({
            fees: parsed.data.fees.length > 0 ? parsed.data.fees : undefined,
            deactivations: deactivations.length > 0 ? deactivations : undefined,
          });
        } catch (err) {
          setFeesSubmitError(
            err instanceof Error
              ? err.message
              : "Não foi possível salvar as taxas.",
          );
          return;
        }
      }

      setFeesDialog(null);
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

  async function confirmClassification() {
    if (!classificationDialog) return;
    setLoading(true);
    try {
      await onUpdateClassification(
        classificationDialog.member.memberId,
        classificationDialog.value === "none"
          ? null
          : classificationDialog.value,
      );
      setClassificationDialog(null);
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

  const feeDraftEmpty = feesRows.every(
    (row) => row.percent.trim() === "" && row.fixed.trim() === "",
  );
  const feeHasPriorOverride = feesRows.some((row) => row.configured);
  // Índices originais preservados (necessários para handleFeeFieldChange),
  // separados só para render: tabela de crédito (12 faixas) + card de débito
  // (1 linha, sem faixa).
  const creditFeeRows = feesRows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => row.paymentMethod === "credit_card");
  const debitFeeRow = feesRows
    .map((row, idx) => ({ row, idx }))
    .find(({ row }) => row.paymentMethod === "debit_card");

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
                onClick={() => onOpenMember(member)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 p-3 sm:px-4",
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
                {member.classification != null && (
                  <Badge
                    variant="ghost"
                    className="shrink-0 bg-surface-2 text-text-muted"
                  >
                    {MEMBER_CLASSIFICATION_LABELS[member.classification]}
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
                    onCommission={() => openCommission(member)}
                    onFees={() => openFees(member)}
                    onClassification={() =>
                      setClassificationDialog({
                        member,
                        value: member.classification ?? "none",
                      })
                    }
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
        open={!!classificationDialog}
        onOpenChange={(v) => !v && setClassificationDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Classificação</DialogTitle>
            <DialogDescription>
              Defina a classificação de{" "}
              <span className="font-medium text-foreground">
                {classificationDialog?.member.userName}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Classificação</Label>
            <Select
              value={classificationDialog?.value}
              onValueChange={(v) =>
                classificationDialog &&
                setClassificationDialog({
                  ...classificationDialog,
                  value: v as MemberClassification | "none",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resident">
                  {MEMBER_CLASSIFICATION_LABELS.resident}
                </SelectItem>
                <SelectItem value="guest">
                  {MEMBER_CLASSIFICATION_LABELS.guest}
                </SelectItem>
                <SelectItem value="none">Sem classificação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={loading}
              onClick={confirmClassification}
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
          <div className="grid max-h-[60vh] gap-5 overflow-y-auto pr-1">
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

            {permsSubmitError && (
              <p className="text-sm text-destructive">{permsSubmitError}</p>
            )}
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

      <Dialog
        open={!!commissionDialog}
        onOpenChange={(v) => !v && setCommissionDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comissão</DialogTitle>
            <DialogDescription>
              Configure o percentual de repasse de{" "}
              <span className="font-medium text-foreground">
                {commissionDialog?.userName}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-5 overflow-y-auto pr-1">
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

            {commissionSubmitError && (
              <p className="text-sm text-destructive">
                {commissionSubmitError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={
                loading ||
                commissionsLoading ||
                !!commissionError ||
                !!commissionsError ||
                (commissionPercent.trim() === "" && !commissionWasConfigured)
              }
              onClick={confirmCommission}
              className="w-full sm:w-auto"
            >
              {loading ? "Salvando…" : "Salvar comissão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!feesDialog}
        onOpenChange={(v) => !v && setFeesDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Taxas de cartão</DialogTitle>
            <DialogDescription>
              Configure as taxas de cartão de{" "}
              <span className="font-medium text-foreground">
                {feesDialog?.userName}
              </span>
              . Uma taxa definida aqui substitui a taxa da organização para este
              funcionário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
            <div className="grid gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3">
              <p className="text-sm font-medium text-foreground">
                {FEE_METHOD_LABEL.credit_card}
              </p>
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[22%] whitespace-normal px-1.5 py-1.5">
                      Parcelas
                    </TableHead>
                    <TableHead className="w-[39%] whitespace-normal px-1.5 py-1.5">
                      Percentual (%)
                    </TableHead>
                    <TableHead className="w-[39%] whitespace-normal px-1.5 py-1.5">
                      Valor fixo (R$)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditFeeRows.map(({ row, idx }) => (
                    <TableRow
                      key={`${row.paymentMethod}-${row.installments}`}
                      className="hover:bg-transparent"
                    >
                      <TableCell className="px-1.5 py-1.5 text-xs whitespace-normal text-foreground/60">
                        {row.installments === 1
                          ? "1x (à vista)"
                          : `${row.installments}x`}
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5">
                        <Input
                          placeholder={
                            memberFeesLoading
                              ? "Carregando…"
                              : row.inheritedPercent || "Sem taxa"
                          }
                          inputMode="decimal"
                          autoComplete="off"
                          disabled={memberFeesLoading || !!memberFeesError}
                          className="px-2 text-xs"
                          value={row.percent}
                          onChange={(e) =>
                            handleFeeFieldChange(idx, "percent", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5">
                        <Input
                          placeholder={
                            memberFeesLoading
                              ? "Carregando…"
                              : row.inheritedFixed || "Sem taxa"
                          }
                          inputMode="decimal"
                          autoComplete="off"
                          disabled={memberFeesLoading || !!memberFeesError}
                          className="px-2 text-xs"
                          value={row.fixed}
                          onChange={(e) =>
                            handleFeeFieldChange(idx, "fixed", e.target.value)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-foreground/50">
                Em branco = herda a taxa da organização para aquela faixa (o
                número mostrado no campo é a taxa herdada; &quot;Sem taxa&quot;
                = a organização também não configurou). Preencha só as faixas em
                que este funcionário deve ter uma taxa diferente.
              </p>
            </div>

            {debitFeeRow && (
              <div className="grid gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3">
                <p className="text-sm font-medium text-foreground">
                  {FEE_METHOD_LABEL.debit_card}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>Percentual (%)</Label>
                    <Input
                      placeholder={
                        memberFeesLoading
                          ? "Carregando…"
                          : debitFeeRow.row.inheritedPercent || "0,00"
                      }
                      inputMode="decimal"
                      autoComplete="off"
                      disabled={memberFeesLoading || !!memberFeesError}
                      value={debitFeeRow.row.percent}
                      onChange={(e) =>
                        handleFeeFieldChange(
                          debitFeeRow.idx,
                          "percent",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Valor fixo (R$)</Label>
                    <Input
                      placeholder={
                        memberFeesLoading
                          ? "Carregando…"
                          : debitFeeRow.row.inheritedFixed || "0,00"
                      }
                      inputMode="decimal"
                      autoComplete="off"
                      disabled={memberFeesLoading || !!memberFeesError}
                      value={debitFeeRow.row.fixed}
                      onChange={(e) =>
                        handleFeeFieldChange(
                          debitFeeRow.idx,
                          "fixed",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-foreground/50">
                  {debitFeeRow.row.source === "member"
                    ? "Taxa própria deste funcionário. Limpe os dois campos e salve para remover e voltar à taxa da organização."
                    : debitFeeRow.row.source === "org"
                      ? "Herdado da organização."
                      : "Sem taxa configurada para este método."}
                </p>
              </div>
            )}

            {feesFieldError && (
              <p className="text-xs text-destructive">{feesFieldError}</p>
            )}
            {memberFeesError && (
              <p className="text-sm text-destructive">{memberFeesError}</p>
            )}
            {feesSubmitError && (
              <p className="text-sm text-destructive">{feesSubmitError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={
                loading ||
                memberFeesLoading ||
                !!feesFieldError ||
                !!memberFeesError ||
                (feeDraftEmpty && !feeHasPriorOverride)
              }
              onClick={confirmFees}
              className="w-full sm:w-auto"
            >
              {loading ? "Salvando…" : "Salvar taxas"}
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
  onCommission,
  onFees,
  onClassification,
}: {
  member: Member;
  onChangeRole: (role: OrgRole) => void;
  onRemove: () => void;
  onToggleStatus: () => void;
  onPermissions: () => void;
  onCommission: () => void;
  onFees: () => void;
  onClassification: () => void;
}) {
  const nextRole: OrgRole = member.role === "owner" ? "employee" : "owner";
  const nextRoleLabel =
    nextRole === "owner" ? "Tornar proprietário" : "Tornar funcionário";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {member.role === "employee" && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onPermissions();
            }}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Permissões
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onCommission();
          }}
        >
          <Percent className="mr-2 h-4 w-4" />
          Comissão
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onFees();
          }}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Taxas de cartão
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onClassification();
          }}
        >
          <Tag className="mr-2 h-4 w-4" />
          Classificação
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onChangeRole(nextRole);
          }}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          {nextRoleLabel}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus();
          }}
        >
          <Power className="mr-2 h-4 w-4" />
          {member.enabled ? "Desativar" : "Ativar"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <UserMinus className="mr-2 h-4 w-4" />
          Remover
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
