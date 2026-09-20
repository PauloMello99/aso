"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useCurrentOrg } from "@/features/dashboard";
import { canAccessModule } from "@/features/dashboard/lib/nav";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useMemberCommissions,
  useMemberPaymentFees,
  COMMISSION_MODE_LABELS,
  type FeeEligibleMethod,
} from "@/features/cashier";
import { useServices } from "@/features/services/hooks/use-services";
import { useTransactions } from "@/features/cashier/hooks/use-transactions";
import { TransactionList } from "@/features/cashier/components/transaction-list";
import type { TransactionView } from "@/features/cashier/types";
import { useMoneyFormatter } from "@/shared/hooks/use-money-formatter";
import { ListPagination } from "@/shared/components/ui/list-pagination";
import type { ServicesFilter } from "@/features/services/types";
import { ApiError } from "@/infrastructure/api/client";
import { useMembers } from "../hooks/use-members";
import { useMemberPayments } from "../hooks/use-member-payments";
import { MemberServiceList } from "./member-service-list";
import { MemberPaymentList } from "./member-payment-list";
import { PayMemberDialog } from "./pay-member-dialog";
import { MemberReportDialog } from "./member-report-dialog";
import { downloadAuthenticatedFile } from "@/shared/lib/download-file";
import { buildMemberServicesFilter } from "../lib/member-services-period";
import { toMemberPaymentBody } from "../schemas/member-payment.schemas";
import type { MemberPaymentFormValues } from "../schemas/member-payment.schemas";
import { MEMBER_CLASSIFICATION_LABELS } from "../types";
import type { OrgRole, MemberPaymentView } from "../types";

interface MemberDetailPageProps {
  orgId: string;
  orgSlug: string;
  userId: string | undefined;
  routerReady: boolean;
}

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Proprietário",
  employee: "Funcionário",
};

const FEE_METHOD_LABEL: Record<FeeEligibleMethod, string> = {
  credit_card: "Crédito",
  debit_card: "Débito",
};

const FEE_METHODS: FeeEligibleMethod[] = ["credit_card", "debit_card"];

function noop() {
  // TransactionList exige onReverse/onCorrect mesmo com canManage=false (os
  // botões nunca renderizam) — sem ação nesta tela, que é só leitura.
}

const TRANSACTIONS_PAGE_SIZE = 10;

// As listagens de serviços/transações passaram a ser paginadas no servidor
// (default 50, teto 200); esta tela pagina no cliente sobre o array inteiro,
// então pede o teto. Acima de 200 itens o histórico do membro é truncado —
// migrar para paginação servidor-side é follow-up (ver ADR-0026 de paginação).
const MEMBER_LIST_LIMIT = 200;

// Paginação client-side (o endpoint de transações não pagina), no mesmo padrão
// de MemberServiceList.
function PaginatedTransactionList({
  transactions,
}: {
  transactions: TransactionView[];
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(
    1,
    Math.ceil(transactions.length / TRANSACTIONS_PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageItems = transactions.slice(
    (currentPage - 1) * TRANSACTIONS_PAGE_SIZE,
    currentPage * TRANSACTIONS_PAGE_SIZE,
  );
  return (
    <div className="space-y-3">
      <TransactionList
        transactions={pageItems}
        onReverse={noop}
        onCorrect={noop}
        canManage={false}
      />
      <ListPagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={transactions.length}
        itemsLabel="transações"
        onPageChange={setPage}
      />
    </div>
  );
}

const MEMBER_PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  MEMBER_PAYMENT_NOT_FOUND: "Pagamento não encontrado.",
  MEMBER_PAYMENT_ALREADY_REVERSED: "Este pagamento já foi estornado.",
  MEMBER_PAYMENT_NOT_REVERSIBLE:
    "Este lançamento já é um estorno — não é possível estorná-lo de novo.",
  PAYMENT_MEMBER_NOT_FOUND:
    "Este membro não está habilitado para receber pagamentos.",
  MEMBER_PAYMENT_CATEGORY_NOT_FOUND:
    "Categoria de pagamento a funcionário não configurada para esta organização.",
  CASHIER_FORBIDDEN: "Você não tem permissão para realizar esta ação.",
  TRANSACTION_IS_MEMBER_PAYMENT:
    "Este lançamento é um pagamento a membro — estorne ou corrija pela tela do membro.",
  TRANSACTION_ALREADY_REVERSED: "Este lançamento já foi estornado.",
  MEMBER_REPORT_INVALID_PERIOD:
    "Período inválido: a data final não pode ser anterior à data inicial.",
};

function memberPaymentErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code) {
      const mapped = MEMBER_PAYMENT_ERROR_MESSAGES[err.code];
      if (mapped) return mapped;
      if (err.code === "SUBSCRIPTION_REQUIRED") return err.message;
    }
    return "Não foi possível concluir esta ação.";
  }
  if (err instanceof Error) return err.message;
  return "Não foi possível concluir esta ação.";
}

const RECEIPT_ERROR_MESSAGES: Record<string, string> = {
  CASHIER_FORBIDDEN: "Você não tem permissão para gerar este documento.",
  MEMBER_PAYMENT_NOT_FOUND: "Pagamento não encontrado.",
  PAYMENT_MEMBER_NOT_FOUND:
    "Este membro não está habilitado para receber pagamentos.",
  ORGANIZATION_NOT_FOUND: "Organização não encontrada.",
};

function receiptErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    const mapped = RECEIPT_ERROR_MESSAGES[err.code];
    if (mapped) return mapped;
  }
  return "Não foi possível baixar o recibo. Tente novamente.";
}

interface ReverseMemberPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: MemberPaymentView | null;
  onConfirm: () => Promise<void>;
}

// Confirmação obrigatória antes de estornar (requisito do passo 12) — copy
// deixa claro que gera um lançamento de estorno no CAIXA, não é só remover um
// registro administrativo. Mesmo padrão do ReverseDialog de cashier, mas
// inline aqui (fora do escopo de arquivos do passo 12 criar um novo dialog
// dedicado).
function ReverseMemberPaymentDialog({
  open,
  onOpenChange,
  target,
  onConfirm,
}: ReverseMemberPaymentDialogProps) {
  const money = useMoneyFormatter();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Estornar pagamento</DialogTitle>
          <DialogDescription>
            Será criado um lançamento de estorno no caixa que anula este
            pagamento — o saldo devido deste membro volta a incluir o valor
            estornado. O pagamento original permanece no histórico, marcado
            como estornado. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-3 text-sm">
            <p className="truncate text-foreground/70">
              {target.entity.description ?? "Pagamento"}
            </p>
            <p className="mt-0.5 tabular-nums text-foreground/40">
              {money(target.entity.amountCents)}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {loading ? "Estornando…" : "Confirmar estorno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 sm:p-4">
      <span className="text-xs leading-tight text-foreground/40">{label}</span>
      {loading ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-foreground/[0.06]" />
      ) : (
        <p className="mt-2 whitespace-nowrap text-base font-semibold tabular-nums text-foreground sm:text-lg">
          {value}
        </p>
      )}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]"
        />
      ))}
    </div>
  );
}

function BackLink({ orgSlug }: { orgSlug: string }) {
  return (
    <Link
      href={`/dashboard/org/${orgSlug}/members`}
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Membros
    </Link>
  );
}

export function MemberDetailPage({
  orgId,
  orgSlug,
  userId,
  routerReady,
}: MemberDetailPageProps) {
  const { org } = useCurrentOrg();
  const { user, loading: authLoading } = useAuth();
  const isOwner = org.role === "owner";
  const canAccessCashier = canAccessModule(org.role, org.permissions, "cashier");
  const canAccessServices = canAccessModule(org.role, org.permissions, "services");

  // GET /orgs/:orgId/members devolve a lista inteira a qualquer membro
  // habilitado (mesmo endpoint de `members-page.tsx`) — não é um segundo
  // ponto de vazamento introduzido aqui.
  const { members, loading: membersLoading, error: membersError } =
    useMembers(orgId, false);

  const member = useMemo(
    () => members.find((m) => m.userId === userId),
    [members, userId],
  );
  const currentUserEmail = user?.email ?? "";
  const isSelf = !!member && member.userEmail === currentUserEmail;
  const canView = isOwner || isSelf;
  const dataReady = routerReady && !membersLoading && !authLoading;
  const shouldFetchDetails = dataReady && canView && !!member;
  // Beneficiário desabilitado: `ensureBeneficiary` no controller (filtra por
  // `member.enabled`) recusa /payments e /payment-summary com 404 mesmo para
  // o owner — não disparamos essas duas chamadas para não renderizar a
  // mensagem crua do backend; as duas seções tratam isso como estado
  // explícito. Comissão/taxas/serviços/transações não passam por
  // `ensureBeneficiary` no backend, então continuam disponíveis mesmo para
  // membro desabilitado (histórico pode existir de quando estava habilitado).
  const canFetchPayments = shouldFetchDetails && member?.enabled === true;
  // O histórico de pagamentos agora é listável mesmo para membro desabilitado
  // (permite estornar); o resumo continua restrito a habilitados.
  const canFetchPaymentHistory = shouldFetchDetails;

  const { commissions, loading: commissionsLoading } = useMemberCommissions(
    orgId,
    canAccessCashier && shouldFetchDetails,
  );
  const { memberFees, loading: memberFeesLoading } = useMemberPaymentFees(
    orgId,
    canAccessCashier && shouldFetchDetails,
  );

  const {
    payments,
    paymentsLoading,
    paymentsError,
    summary,
    summaryLoading,
    summaryError,
    createPayment,
    reversePayment,
    correctPayment,
  } = useMemberPayments(
    orgId,
    userId,
    canFetchPaymentHistory,
    canFetchPayments,
  );

  const money = useMoneyFormatter();
  const [serviceFilter, setServiceFilter] = useState<ServicesFilter>({});

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [correctTarget, setCorrectTarget] = useState<MemberPaymentView | null>(
    null,
  );
  const [reverseTarget, setReverseTarget] = useState<MemberPaymentView | null>(
    null,
  );
  const [receiptDownloadingId, setReceiptDownloadingId] = useState<
    string | null
  >(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Diferente de handleCorrectPayment/handleReversePayment: re-lança depois
  // do alert() para que PayMemberDialog NÃO chame onOpenChange(false) (só
  // fecha depois que `await onSubmit(values)` resolve sem erro) — falha na
  // criação mantém o sheet aberto com o valor digitado, em vez de fechar e
  // descartar o que o usuário já preencheu.
  async function handleCreatePayment(values: MemberPaymentFormValues) {
    try {
      await createPayment(toMemberPaymentBody(values));
    } catch (err) {
      alert(memberPaymentErrorMessage(err));
      throw err;
    }
  }

  async function handleCorrectPayment(values: MemberPaymentFormValues) {
    if (!correctTarget) return;
    try {
      await correctPayment(correctTarget.entity.id, toMemberPaymentBody(values));
    } catch (err) {
      alert(memberPaymentErrorMessage(err));
    }
  }

  // Recibo: segue o padrão local (alert) para erros; o botão do item fica
  // desabilitado enquanto baixa.
  async function handleDownloadReceipt(view: MemberPaymentView) {
    if (!userId || receiptDownloadingId) return;
    setReceiptDownloadingId(view.entity.id);
    try {
      await downloadAuthenticatedFile(
        `/orgs/${orgId}/members/${userId}/payments/${view.entity.id}/receipt`,
        "recibo-pagamento.pdf",
      );
    } catch (err) {
      alert(receiptErrorMessage(err));
    } finally {
      setReceiptDownloadingId(null);
    }
  }

  async function handleReversePayment() {
    if (!reverseTarget) return;
    try {
      await reversePayment(reverseTarget.entity.id);
    } catch (err) {
      alert(memberPaymentErrorMessage(err));
    }
  }

  const {
    services,
    loading: servicesLoading,
    error: servicesError,
  } = useServices(
    canAccessServices && shouldFetchDetails ? orgId : "",
    userId
      ? { ...buildMemberServicesFilter(serviceFilter, userId), limit: MEMBER_LIST_LIMIT }
      : undefined,
  );

  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
  } = useTransactions(
    canAccessCashier && shouldFetchDetails ? orgId : "",
    userId ? { createdBy: userId, limit: MEMBER_LIST_LIMIT } : undefined,
  );

  if (!routerReady || membersLoading || authLoading) {
    return (
      <div className="space-y-6">
        <BackLink orgSlug={orgSlug} />
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="space-y-4">
        <BackLink orgSlug={orgSlug} />
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {membersError}
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <BackLink orgSlug={orgSlug} />
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Membro não encontrado.
        </div>
      </div>
    );
  }

  // Funcionário só acessa a própria página — o backend também recusa (403)
  // as rotas de pagamento para outro :userId; aqui bloqueamos antes mesmo de
  // disparar essas requisições (shouldFetchDetails acima já não as chama).
  const deniedByAccessCheck = !canView;
  const deniedByBackend =
    paymentsError?.status === 403 || summaryError?.status === 403;
  if (deniedByAccessCheck || deniedByBackend) {
    return (
      <div className="space-y-4">
        <BackLink orgSlug={orgSlug} />
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Você não tem acesso à página deste membro.
        </div>
      </div>
    );
  }

  const commission = commissions.find((c) => c.userId === member.userId);
  // Faixa à vista (1x) é a exibida; faixas parceladas com override próprio
  // são só contadas ("+N faixas parceladas").
  const fees = FEE_METHODS.map((method) => ({
    method,
    fee: memberFees.find(
      (f) =>
        f.userId === member.userId &&
        f.paymentMethod === method &&
        f.installments === 1,
    ),
    extraTiers:
      method === "credit_card"
        ? memberFees.filter(
            (f) =>
              f.userId === member.userId &&
              f.paymentMethod === method &&
              f.installments > 1 &&
              f.source === "member",
          ).length
        : 0,
  }));

  return (
    <div className="space-y-6">
      <BackLink orgSlug={orgSlug} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-foreground">
              {member.userName}
            </h1>
            <Badge variant={member.role === "owner" ? "brand" : "secondary"}>
              {ROLE_LABEL[member.role]}
            </Badge>
            <Badge variant={member.enabled ? "success" : "destructive-subtle"}>
              {member.enabled ? "Habilitado" : "Desabilitado"}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-foreground/40">
            {member.userEmail}
          </p>
        </div>
        {member.enabled && userId && (
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setReportDialogOpen(true)}
          >
            <FileText className="h-4 w-4 shrink-0" />
            Exportar relatório
          </Button>
        )}
      </div>

      {/* Resumo */}
      <div className="space-y-4 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome" value={member.userName} />
          <Field label="E-mail" value={member.userEmail} />
          <Field label="Função" value={ROLE_LABEL[member.role]} />
          <Field
            label="Classificação"
            value={
              member.classification
                ? MEMBER_CLASSIFICATION_LABELS[member.classification]
                : "—"
            }
          />
        </div>

        <Separator className="bg-foreground/[0.06]" />

        {!canAccessCashier ? (
          <p className="text-sm text-foreground/40">
            Sem permissão para ver comissão e taxas (módulo Caixa).
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Comissão configurada"
                value={
                  commissionsLoading
                    ? "Carregando…"
                    : commission?.configured
                      ? `${commission.percent}% · ${
                          COMMISSION_MODE_LABELS[commission.mode ?? "gross"]
                        }`
                      : "Não configurada"
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fees.map(({ method, fee, extraTiers }) => (
                <Field
                  key={method}
                  label={`Taxa de ${FEE_METHOD_LABEL[method]}${
                    method === "credit_card" ? " à vista (1x)" : ""
                  }`}
                  value={
                    memberFeesLoading
                      ? "Carregando…"
                      : fee
                        ? `${fee.percent}% + ${money(fee.fixedCents)} (${
                            fee.source === "member"
                              ? "própria"
                              : fee.source === "org"
                                ? "herdada da organização"
                                : "sem taxa"
                          })${
                            extraTiers > 0
                              ? ` · +${extraTiers} ${
                                  extraTiers === 1
                                    ? "faixa parcelada"
                                    : "faixas parceladas"
                                }`
                              : ""
                          }`
                        : "—"
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Financeiro */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-foreground">Financeiro</h2>
          {isOwner && member.enabled && (
            <Button
              size="sm"
              className="w-full sm:w-auto"
              disabled={summaryLoading}
              onClick={() => setPayDialogOpen(true)}
            >
              Pagar
            </Button>
          )}
        </div>
        {!member.enabled ? (
          <p className="text-sm text-foreground/40">
            Membro desabilitado — o resumo de comissão acumulada, total pago e
            saldo devido não fica disponível enquanto o acesso estiver
            suspenso. A comissão configurada continua visível no Resumo,
            acima, e o histórico de pagamentos abaixo permite estornar
            pagamentos já feitos.
          </p>
        ) : summaryError && summaryError.status !== 403 ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {summaryError.message}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard
                label="Comissão acumulada"
                value={money(summary?.accruedCommissionCents ?? 0)}
                loading={summaryLoading}
              />
              <SummaryCard
                label="Total já pago"
                value={money(summary?.paidNetCents ?? 0)}
                loading={summaryLoading}
              />
              <SummaryCard
                label="Saldo devido"
                value={money(summary?.balanceDueCents ?? 0)}
                loading={summaryLoading}
              />
              <SummaryCard
                label="Receita bruta"
                value={money(summary?.grossRevenueCents ?? 0)}
                loading={summaryLoading}
              />
              <SummaryCard
                label="Taxas"
                value={money(summary?.feesCents ?? 0)}
                loading={summaryLoading}
              />
              <SummaryCard
                label="Líquido do estúdio"
                value={money(summary?.studioNetCents ?? 0)}
                loading={summaryLoading}
              />
              <SummaryCard
                label="Custo de material"
                value={money(summary?.materialCostCents ?? 0)}
                loading={summaryLoading}
              />
            </div>
            <p className="text-xs text-foreground/40">
              Receita bruta e taxas consideram apenas serviços pagos; o custo
              de material considera todos os serviços não cancelados do membro.
              Líquido do estúdio = receita bruta − taxas − comissão.
            </p>
          </div>
        )}
      </section>

      {/* Serviços do membro */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Serviços</h2>
        {!canAccessServices ? (
          <p className="text-sm text-foreground/40">
            Sem permissão para ver serviços (módulo Serviços).
          </p>
        ) : (
          <MemberServiceList
            services={services}
            loading={servicesLoading}
            error={servicesError}
            filter={serviceFilter}
            onFilterChange={setServiceFilter}
          />
        )}
      </section>

      {/* Movimentações */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          Pagamentos ao membro
        </h2>
        {paymentsError && paymentsError.status !== 403 ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {paymentsError.message}
          </div>
        ) : paymentsLoading ? (
          <SectionSkeleton />
        ) : (
          <MemberPaymentList
            payments={payments}
            canManage={isOwner}
            canCorrect={member.enabled}
            onReverse={setReverseTarget}
            onCorrect={setCorrectTarget}
            onDownloadReceipt={handleDownloadReceipt}
            receiptDownloadingId={receiptDownloadingId}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          Transações lançadas pelo membro
        </h2>
        {!canAccessCashier ? (
          <p className="text-sm text-foreground/40">
            Sem permissão para ver transações do caixa (módulo Caixa).
          </p>
        ) : transactionsError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {transactionsError}
          </div>
        ) : transactionsLoading ? (
          <SectionSkeleton />
        ) : transactions.length === 0 ? (
          // TransactionList tem um estado vazio próprio, mas o texto convida a
          // clicar em "Novo lançamento" — botão que não existe nesta tela
          // (só leitura). Mesmo ajuste que CustomerTransactionHistoryList já
          // faz ao reusar as peças de cashier/transaction-list.
          <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
            <p className="text-sm text-foreground/30">
              Nenhuma transação lançada por este membro ainda.
            </p>
          </div>
        ) : (
          <PaginatedTransactionList transactions={transactions} />
        )}
      </section>

      {userId && (
        <MemberReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          orgId={orgId}
          userId={userId}
        />
      )}

      {isOwner && (
        <>
          <PayMemberDialog
            open={payDialogOpen}
            onOpenChange={setPayDialogOpen}
            mode="create"
            suggestedAmountCents={summary?.balanceDueCents ?? 0}
            onSubmit={handleCreatePayment}
          />
          <PayMemberDialog
            open={correctTarget !== null}
            onOpenChange={(v) => !v && setCorrectTarget(null)}
            mode="correct"
            suggestedAmountCents={correctTarget?.entity.amountCents ?? 0}
            original={correctTarget}
            onSubmit={handleCorrectPayment}
          />
          <ReverseMemberPaymentDialog
            open={reverseTarget !== null}
            onOpenChange={(v) => !v && setReverseTarget(null)}
            target={reverseTarget}
            onConfirm={handleReversePayment}
          />
        </>
      )}
    </div>
  );
}
