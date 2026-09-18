"use client";

import { MoreVertical, Pencil, Undo2 } from "lucide-react";
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
import { cn } from "@/shared/lib/utils";
import { formatBRL } from "@/features/cashier/lib/money";
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

function ActionMenu({
  view,
  onReverse,
  onCorrect,
}: {
  view: MemberPaymentView;
  onReverse: (v: MemberPaymentView) => void;
  onCorrect: (v: MemberPaymentView) => void;
}) {
  if (!canMutate(view)) return null;
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
        <DropdownMenuItem onClick={() => onCorrect(view)}>
          <Pencil className="h-3.5 w-3.5 shrink-0" />
          Corrigir valor
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onReverse(view)}
        >
          <Undo2 className="h-3.5 w-3.5 shrink-0" />
          Estornar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface MemberPaymentListProps {
  payments: MemberPaymentView[];
  onReverse: (v: MemberPaymentView) => void;
  onCorrect: (v: MemberPaymentView) => void;
  // Ações de estorno/correção só para owner (passo 12) — funcionário vendo a
  // própria tela nunca recebe canManage=true. Mesmo padrão de
  // transaction-list.tsx: onReverse/onCorrect são exigidos mesmo com
  // canManage=false (o menu de ações nunca renderiza nesse caso).
  canManage?: boolean;
}

export function MemberPaymentList({
  payments,
  onReverse,
  onCorrect,
  canManage = false,
}: MemberPaymentListProps) {
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
        {payments.map((v) => {
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
                  {formatBRL(v.entity.amountCents)}
                </div>
              </div>
              {canManage && (
                <ActionMenu view={v} onReverse={onReverse} onCorrect={onCorrect} />
              )}
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
            {payments.map((v) => {
              const struck = v.reversed;
              return (
                <TableRow
                  key={v.entity.id}
                  className={cn(struck && "bg-foreground/[0.01]")}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium",
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
                    {formatBRL(v.entity.amountCents)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end">
                      {canManage && (
                        <ActionMenu
                          view={v}
                          onReverse={onReverse}
                          onCorrect={onCorrect}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
