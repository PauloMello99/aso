"use client";

import { useState } from "react";
import { FileDown, MoreVertical, Pencil, Undo2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ListPagination } from "@/shared/components/ui/list-pagination";
import { cn } from "@/shared/lib/utils";
import { useMoneyFormatter } from "@/shared/hooks/use-money-formatter";
import type { MemberPaymentView } from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ view }: { view: MemberPaymentView }) {
  if (view.entity.reversesPaymentId) {
    return <Badge variant="secondary">Estorno</Badge>;
  }
  if (view.reversed) {
    return <Badge variant="destructive-subtle">Estornado</Badge>;
  }
  return null;
}

// Uma linha que já É ela mesma um estorno, ou que já FOI estornada por
// outra, não ganha ação nova — o backend rejeita com 422/409 (ver
// reverse-member-payment.use-case.ts), mas a UI não deve nem oferecer o
// botão para esse caso óbvio. Mesmo critério de transaction-list.tsx.
function canMutate(view: MemberPaymentView): boolean {
  return !view.entity.reversesPaymentId && !view.reversed;
}

// Recibo: baixável para qualquer pagamento que não seja a linha de estorno em
// si — pagamento já estornado continua baixável (o PDF sai marcado ESTORNADO).
function canDownloadReceipt(view: MemberPaymentView): boolean {
  return !view.entity.reversesPaymentId;
}

function ActionMenu({
  view,
  onReverse,
  onCorrect,
  canCorrect,
  canManage,
  onDownloadReceipt,
  receiptDownloadingId,
}: {
  view: MemberPaymentView;
  onReverse: (v: MemberPaymentView) => void;
  onCorrect: (v: MemberPaymentView) => void;
  canCorrect: boolean;
  canManage: boolean;
  onDownloadReceipt?: (v: MemberPaymentView) => void;
  receiptDownloadingId?: string | null;
}) {
  const showReceipt = !!onDownloadReceipt && canDownloadReceipt(view);
  const showManage = canManage && canMutate(view);
  if (!showReceipt && !showManage) return null;
  const receiptBusy = receiptDownloadingId === view.entity.id;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[170px]">
        {showReceipt && (
          <DropdownMenuItem
            disabled={receiptBusy}
            onClick={() => onDownloadReceipt?.(view)}
          >
            <FileDown className="h-3.5 w-3.5 shrink-0" />
            {receiptBusy ? "Baixando…" : "Baixar recibo"}
          </DropdownMenuItem>
        )}
        {showManage && canCorrect && (
          <DropdownMenuItem onClick={() => onCorrect(view)}>
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            Corrigir valor
          </DropdownMenuItem>
        )}
        {showManage && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onReverse(view)}
          >
            <Undo2 className="h-3.5 w-3.5 shrink-0" />
            Estornar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PAGE_SIZE = 10;

interface MemberPaymentListProps {
  payments: MemberPaymentView[];
  onReverse: (v: MemberPaymentView) => void;
  onCorrect: (v: MemberPaymentView) => void;
  // Ações de estorno/correção só para owner (passo 12) — funcionário vendo a
  // própria tela nunca recebe canManage=true. Mesmo padrão de
  // transaction-list.tsx: onReverse/onCorrect são exigidos mesmo com
  // canManage=false (o menu de ações nunca renderiza nesse caso).
  canManage?: boolean;
  // Membro desabilitado: o backend ainda permite estornar, mas bloqueia
  // correção (que relança um novo pagamento).
  canCorrect?: boolean;
  // Recibo em PDF: disponível também para o funcionário na própria tela (o
  // backend autoriza owner ou o próprio beneficiário).
  onDownloadReceipt?: (v: MemberPaymentView) => void;
  receiptDownloadingId?: string | null;
}

export function MemberPaymentList({
  payments,
  onReverse,
  onCorrect,
  canManage = false,
  canCorrect = true,
  onDownloadReceipt,
  receiptDownloadingId = null,
}: MemberPaymentListProps) {
  const money = useMoneyFormatter();
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = payments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
        <p className="text-sm text-foreground/30">
          Nenhum pagamento registrado para este membro ainda.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {pageItems.map((v) => {
          const struck = v.reversed;
          return (
            <div
              key={v.entity.id}
              className={cn(
                "flex items-start justify-between gap-3 rounded-xl border p-4",
                struck
                  ? "border-foreground/[0.04] bg-foreground/[0.01]"
                  : "border-foreground/[0.06] bg-foreground/[0.02]",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "truncate font-medium",
                      struck
                        ? "text-foreground/40 line-through"
                        : "text-foreground",
                    )}
                  >
                    {v.entity.description ?? "Pagamento"}
                  </span>
                  <StatusBadge view={v} />
                </div>
                <div className="mt-1 text-xs text-foreground/40">
                  {formatDate(v.entity.createdAt)}
                </div>
                <div
                  className={cn(
                    "mt-2 font-semibold tabular-nums",
                    struck
                      ? "text-foreground/30 line-through"
                      : "text-foreground",
                  )}
                >
                  {money(v.entity.amountCents)}
                </div>
              </div>
              <ActionMenu
                view={v}
                onReverse={onReverse}
                onCorrect={onCorrect}
                canCorrect={canCorrect}
                canManage={canManage}
                onDownloadReceipt={onDownloadReceipt}
                receiptDownloadingId={receiptDownloadingId}
              />
            </div>
          );
        })}
      </div>

      <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Descrição</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((v) => {
              const struck = v.reversed;
              return (
                <TableRow
                  key={v.entity.id}
                  className={cn(struck && "bg-foreground/[0.01]")}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2">
                      <span
                        title={v.entity.description ?? undefined}
                        className={cn(
                          "block max-w-[20rem] truncate font-medium",
                          struck
                            ? "text-foreground/40 line-through"
                            : "text-foreground",
                        )}
                      >
                        {v.entity.description ?? "Pagamento"}
                      </span>
                      <StatusBadge view={v} />
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground/40">
                    {formatDate(v.entity.createdAt)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      struck
                        ? "text-foreground/30 line-through"
                        : "text-foreground",
                    )}
                  >
                    {money(v.entity.amountCents)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end">
                      <ActionMenu
                        view={v}
                        onReverse={onReverse}
                        onCorrect={onCorrect}
                        canCorrect={canCorrect}
                        canManage={canManage}
                        onDownloadReceipt={onDownloadReceipt}
                        receiptDownloadingId={receiptDownloadingId}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={payments.length}
        itemsLabel="pagamentos"
        onPageChange={setPage}
      />
    </>
  );
}
