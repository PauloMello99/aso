"use client"

import { useState } from "react"
import { Plus, RefreshCw, Search, ArrowLeftRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { useCurrentOrg } from "@/features/dashboard"
import { useMembers } from "@/features/organizations/hooks/use-members"
import { useTransactions } from "../hooks/use-transactions"
import { useBalance } from "../hooks/use-balance"
import { usePaymentFees } from "../hooks/use-payment-fees"
import { useTransactionCategories } from "../hooks/use-transaction-categories"
import { BalanceCards } from "./balance-cards"
import { TransactionList } from "./transaction-list"
import { TransactionForm } from "./transaction-form"
import { CorrectionSheet } from "./correction-sheet"
import { ReverseDialog } from "./reverse-dialog"
import { TransferDialog } from "./transfer-dialog"
import { parseReaisToCents } from "../lib/money"
import type {
  TransactionFormValues,
  CorrectionFormValues,
} from "../schemas/cashier.schemas"
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type Transaction,
  type TransactionType,
  type TransactionsFilter,
} from "../types"

interface CashierPageProps {
  orgId: string
}

const METHOD_ORDER: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
  "credits",
]

function toApiBody(values: TransactionFormValues | CorrectionFormValues) {
  return {
    description: values.description,
    type: values.type as TransactionType,
    grossCents: parseReaisToCents(values.amount),
    paymentMethod: values.paymentMethod as PaymentMethod,
    categoryId: values.categoryId || null,
    createdBy: "createdBy" in values ? values.createdBy || null : null,
    transactedAt: values.transactedAt
      ? new Date(values.transactedAt).toISOString()
      : undefined,
  }
}

export function CashierPage({ orgId }: CashierPageProps) {
  const { org } = useCurrentOrg()
  const isOwner = org.role === "owner"
  const { members } = useMembers(orgId)

  const [filter, setFilter] = useState<TransactionsFilter>({})
  const [search, setSearch] = useState("")

  const {
    transactions,
    loading,
    error,
    refetch,
    createTransaction,
    reverseTransaction,
    correctTransaction,
    transfer,
  } = useTransactions(orgId, filter)
  const { balance, loading: balanceLoading } = useBalance(orgId)
  const { fees } = usePaymentFees(orgId)
  const { categories } = useTransactionCategories(orgId)

  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [correctOpen, setCorrectOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [active, setActive] = useState<Transaction | null>(null)

  async function handleCreate(values: TransactionFormValues) {
    await createTransaction(toApiBody(values))
  }

  async function handleCorrect(values: CorrectionFormValues) {
    if (!active) return
    await correctTransaction(active.id, toApiBody(values))
  }

  async function handleReverse() {
    if (!active) return
    try {
      await reverseTransaction(active.id)
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Não foi possível estornar.",
      )
    }
  }

  function applySearch() {
    setFilter((f) => ({ ...f, q: search || undefined }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Caixa</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            {isOwner
              ? "Entradas, saídas e saldo do estúdio."
              : "Seus lançamentos e saldo."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={loading}
            className="shrink-0"
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {isOwner && (
            <Button
              variant="outline"
              onClick={() => setTransferOpen(true)}
              className="shrink-0"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">Transferir</span>
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            Novo lançamento
          </Button>
        </div>
      </div>

      {/* Balances */}
      <BalanceCards balance={balance} loading={balanceLoading} />

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
          <Input
            placeholder="Buscar por descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            onBlur={applySearch}
            className="pl-9"
          />
        </div>
        <Select
          value={filter.type ?? "all"}
          onValueChange={(v) =>
            setFilter((f) => ({
              ...f,
              type: v === "all" ? undefined : (v as TransactionType),
            }))
          }
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="income">Entradas</SelectItem>
            <SelectItem value="outcome">Saídas</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filter.paymentMethod ?? "all"}
          onValueChange={(v) =>
            setFilter((f) => ({
              ...f,
              paymentMethod: v === "all" ? undefined : (v as PaymentMethod),
            }))
          }
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os métodos</SelectItem>
            {METHOD_ORDER.map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* List */}
      {loading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Carregando lançamentos…
        </div>
      ) : (
        <TransactionList
          transactions={transactions}
          canManage={isOwner}
          onReverse={(t) => {
            setActive(t)
            setReverseOpen(true)
          }}
          onCorrect={(t) => {
            setActive(t)
            setCorrectOpen(true)
          }}
        />
      )}

      {/* Sheets / dialogs */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        fees={fees}
        categories={categories}
        isOwner={isOwner}
        members={members}
        onSubmit={handleCreate}
      />
      {/* Transferência, estorno e correção são owner-only. */}
      {isOwner && (
        <>
          <TransferDialog
            open={transferOpen}
            onOpenChange={setTransferOpen}
            onSubmit={transfer}
          />
          <CorrectionSheet
            open={correctOpen}
            onOpenChange={setCorrectOpen}
            transaction={active}
            onSubmit={handleCorrect}
          />
          <ReverseDialog
            open={reverseOpen}
            onOpenChange={setReverseOpen}
            transaction={active}
            onConfirm={handleReverse}
          />
        </>
      )}
    </div>
  )
}
