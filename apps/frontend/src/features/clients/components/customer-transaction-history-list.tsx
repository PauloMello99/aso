"use client"

import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { cn } from "@/shared/lib/utils"
import {
  AmountCell,
  StatusBadge,
  formatDate,
} from "@/features/cashier/components/transaction-list"
import { PAYMENT_METHOD_LABELS, type TransactionView } from "@/features/cashier/types"

interface CustomerTransactionHistoryListProps {
  transactions: TransactionView[]
}

function TransactionCard({ view }: { view: TransactionView }) {
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
            <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-red-400" />
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
        </div>
        <div className="mt-2">
          <AmountCell t={t} struck={struck} />
        </div>
      </div>
    </div>
  )
}

export function CustomerTransactionHistoryList({
  transactions,
}: CustomerTransactionHistoryListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/[0.08] py-16 text-center">
        <p className="text-sm text-foreground/30">
          Nenhuma transação registrada para este cliente ainda.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {transactions.map((v) => (
          <TransactionCard key={v.entity.id} view={v} />
        ))}
      </div>

      <div className="hidden rounded-xl border border-foreground/[0.06] sm:block">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Descrição</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="pr-4 text-right">Valor</TableHead>
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
                        <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-red-400" />
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
                  <TableCell className="pr-4 text-right">
                    <AmountCell t={t} struck={struck} />
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
