"use client"

import {
  ArrowDownLeft,
  ArrowUpRight,
  MoreVertical,
  Pencil,
  Undo2,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { cn } from "@/shared/lib/utils"
import { formatBRL } from "../lib/money"
import {
  PAYMENT_METHOD_LABELS,
  type Transaction,
  type TransactionView,
} from "../types"

interface TransactionListProps {
  transactions: TransactionView[]
  onReverse: (t: Transaction) => void
  onCorrect: (t: Transaction) => void
  canManage?: boolean
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function canMutate(view: TransactionView): boolean {
  return !view.entity.reversesTransactionId && !view.reversed
}

function ActionMenu({
  view,
  onReverse,
  onCorrect,
}: {
  view: TransactionView
  onReverse: (t: Transaction) => void
  onCorrect: (t: Transaction) => void
}) {
  if (!canMutate(view)) return null
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
        <DropdownMenuItem onClick={() => onCorrect(view.entity)}>
          <Pencil className="h-3.5 w-3.5 shrink-0" />
          Corrigir (errata)
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onReverse(view.entity)}>
          <Undo2 className="h-3.5 w-3.5 shrink-0" />
          Estornar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function StatusBadge({ view }: { view: TransactionView }) {
  if (view.entity.reversesTransactionId) {
    return <Badge variant="secondary">Estorno</Badge>
  }
  if (view.reversed) {
    return <Badge variant="destructive-subtle">Estornada</Badge>
  }
  return null
}

export function AmountCell({ t, struck }: { t: Transaction; struck: boolean }) {
  const isIncome = t.type === "income"
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        struck && "text-foreground/30 line-through",
        !struck && (isIncome ? "text-success" : "text-destructive"),
      )}
    >
      {isIncome ? "+" : "−"} {formatBRL(t.netCents)}
    </span>
  )
}

function MobileCard({
  view,
  onReverse,
  onCorrect,
  canManage,
}: {
  view: TransactionView
  onReverse: (t: Transaction) => void
  onCorrect: (t: Transaction) => void
  canManage: boolean
}) {
  const t = view.entity
  const struck = view.reversed
  const isIncome = t.type === "income"
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border p-4",
        struck
          ? "border-foreground/[0.04] bg-foreground/[0.01]"
          : "border-foreground/[0.06] bg-foreground/[0.02]",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {isIncome ? (
            <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-success" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-destructive" />
          )}
          <span
            className={cn(
              "truncate font-medium",
              struck ? "text-foreground/40 line-through" : "text-foreground",
            )}
          >
            {t.description}
          </span>
          <StatusBadge view={view} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-foreground/40">
          <span>{PAYMENT_METHOD_LABELS[t.paymentMethod]}</span>
          <span>{formatDate(t.transactedAt)}</span>
          {t.feeCents > 0 && <span>taxa {formatBRL(t.feeCents)}</span>}
        </div>
        <div className="mt-2">
          <AmountCell t={t} struck={struck} />
        </div>
      </div>
      {canManage && (
        <ActionMenu view={view} onReverse={onReverse} onCorrect={onCorrect} />
      )}
    </div>
  )
}

export function TransactionList({
  transactions,
  onReverse,
  onCorrect,
  canManage = false,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
        <p className="text-sm text-foreground/30">Nenhum lançamento ainda.</p>
        <p className="mt-1 text-xs text-foreground/20">
          Clique em &quot;Novo lançamento&quot; para registrar uma entrada ou
          saída.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {transactions.map((v) => (
          <MobileCard
            key={v.entity.id}
            view={v}
            onReverse={onReverse}
            onCorrect={onCorrect}
            canManage={canManage}
          />
        ))}
      </div>

      <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Descrição</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((v) => {
              const t = v.entity
              const struck = v.reversed
              return (
                <TableRow key={t.id} className={cn(struck && "bg-foreground/[0.01]")}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2">
                      {t.type === "income" ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-destructive" />
                      )}
                      <span
                        className={cn(
                          "font-medium",
                          struck ? "text-foreground/40 line-through" : "text-foreground",
                        )}
                      >
                        {t.description}
                      </span>
                      <StatusBadge view={v} />
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground/50">
                    {PAYMENT_METHOD_LABELS[t.paymentMethod]}
                  </TableCell>
                  <TableCell className="text-foreground/40">
                    {formatDate(t.transactedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AmountCell t={t} struck={struck} />
                    {t.feeCents > 0 && (
                      <div className="text-xs text-foreground/30">
                        taxa {formatBRL(t.feeCents)}
                      </div>
                    )}
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
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
