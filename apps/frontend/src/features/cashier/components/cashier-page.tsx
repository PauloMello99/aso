"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, RefreshCw, Search, ArrowLeftRight, Tag } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { PaginationBar } from "@/shared/components/pagination-bar"
import {
  FilterPopover,
  FilterField,
  RangeInputs,
} from "@/shared/components/ui/filter-popover"
import {
  ExportMenu,
  type ExportFormat,
} from "@/shared/components/ui/export-menu"
import { downloadExport } from "@/shared/lib/download-export"
import { useCurrentOrg } from "@/features/dashboard"
import { useMembers } from "@/features/organizations/hooks/use-members"
import {
  ServicePaymentCorrectionSheet,
  type ServicePaymentCorrectionTarget,
  useCorrectServicePayment,
  toCorrectPaymentBody,
  type CorrectServicePaymentFormValues,
} from "@/features/services"
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
import { cashierErrorMessage } from "../lib/error-messages"
import type {
  TransactionFormValues,
  CorrectionFormValues,
} from "../schemas/cashier.schemas"
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type TransactionType,
  type TransactionsFilter,
  type TransactionView,
} from "../types"

interface CashierPageProps {
  orgId: string
}

const METHOD_ORDER: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
]

const EXPORT_COLUMNS = [
  { key: "date", label: "Data" },
  { key: "description", label: "Descrição" },
  { key: "type", label: "Tipo" },
  { key: "paymentMethod", label: "Método" },
  { key: "gross", label: "Bruto (R$)" },
  { key: "fee", label: "Taxa (R$)" },
  { key: "net", label: "Líquido (R$)" },
  { key: "reversal", label: "Estorno" },
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
  const [amount, setAmount] = useState({ min: "", max: "" })

  function updateFilter(patch: Partial<TransactionsFilter>) {
    setFilter((f) => ({ ...f, ...patch, page: 1 }))
  }

  function goToPage(p: number) {
    setFilter((f) => ({ ...f, page: p }))
  }

  const advancedCount =
    (filter.from ? 1 : 0) +
    (filter.to ? 1 : 0) +
    (filter.categoryId ? 1 : 0) +
    (filter.createdBy ? 1 : 0) +
    (filter.minCents !== undefined ? 1 : 0) +
    (filter.maxCents !== undefined ? 1 : 0)

  function setAmountFilter(which: "min" | "max", raw: string) {
    setAmount((a) => ({ ...a, [which]: raw }))
    const cents = raw.trim() ? parseReaisToCents(raw) : Number.NaN
    updateFilter({
      [which === "min" ? "minCents" : "maxCents"]: Number.isNaN(cents)
        ? undefined
        : cents,
    })
  }

  function clearAdvanced() {
    setAmount({ min: "", max: "" })
    updateFilter({
      from: undefined,
      to: undefined,
      categoryId: undefined,
      createdBy: undefined,
      minCents: undefined,
      maxCents: undefined,
    })
  }

  async function handleExport(fields: string[], format: ExportFormat) {
    await downloadExport(
      `/orgs/${orgId}/cashier/transactions/export`,
      `caixa-${new Date().toISOString().slice(0, 10)}`,
      format,
      {
        from: filter.from,
        to: filter.to,
        type: filter.type,
        paymentMethod: filter.paymentMethod,
        categoryId: filter.categoryId,
        minCents: filter.minCents,
        maxCents: filter.maxCents,
        createdBy: filter.createdBy,
        q: filter.q,
        fields: fields.join(","),
      },
    )
  }

  const {
    transactions,
    total,
    page,
    pages,
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
  const [active, setActive] = useState<TransactionView | null>(null)
  const { correctPayment: correctServicePayment } = useCorrectServicePayment(orgId)

  async function handleCreate(values: TransactionFormValues) {
    await createTransaction(toApiBody(values))
  }

  async function handleCorrect(values: CorrectionFormValues) {
    if (!active) return
    try {
      await correctTransaction(active.entity.id, toApiBody(values))
    } catch (err) {
      alert(cashierErrorMessage(err))
    }
  }

  async function handleCorrectServicePayment(
    values: CorrectServicePaymentFormValues,
  ) {
    if (!active || !active.serviceId) return
    try {
      await correctServicePayment(active.serviceId, toCorrectPaymentBody(values))
    } catch (err) {
      alert(cashierErrorMessage(err))
    }
  }

  async function handleReverse() {
    if (!active) return
    try {
      await reverseTransaction(active.entity.id)
    } catch (err) {
      alert(cashierErrorMessage(err))
    }
  }

  function applySearch() {
    updateFilter({ q: search || undefined })
  }

  return (
    <div className="space-y-6">
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
          <ExportMenu columns={EXPORT_COLUMNS} onExport={handleExport} />
          {isOwner && (
            <>
              <Button
                variant="outline"
                onClick={() => setTransferOpen(true)}
                className="shrink-0"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">Transferir</span>
              </Button>
              <Button variant="outline" asChild className="shrink-0">
                <Link href={`/dashboard/org/${org.slug}/settings/cashier`}>
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Categorias</span>
                </Link>
              </Button>
            </>
          )}
          <Button onClick={() => setFormOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            Novo lançamento
          </Button>
        </div>
      </div>

      <BalanceCards balance={balance} loading={balanceLoading} />

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
            updateFilter({
              type: v === "all" ? undefined : (v as TransactionType),
            })
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
            updateFilter({
              paymentMethod: v === "all" ? undefined : (v as PaymentMethod),
            })
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
        <FilterPopover activeCount={advancedCount} onClear={clearAdvanced}>
          <div className="grid grid-cols-2 gap-2">
            <FilterField label="De">
              <DatePicker
                value={filter.from ?? ""}
                onChange={(v) => updateFilter({ from: v || undefined })}
                placeholder="Início"
              />
            </FilterField>
            <FilterField label="Até">
              <DatePicker
                value={filter.to ?? ""}
                onChange={(v) => updateFilter({ to: v || undefined })}
                placeholder="Fim"
              />
            </FilterField>
          </div>
          <FilterField label="Categoria">
            <Select
              value={filter.categoryId ?? "all"}
              onValueChange={(v) =>
                updateFilter({ categoryId: v === "all" ? undefined : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          {isOwner && (
            <FilterField label="Membro">
              <Select
                value={filter.createdBy ?? "all"}
                onValueChange={(v) =>
                  updateFilter({ createdBy: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Membro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os membros</SelectItem>
                  {members
                    .filter((m) => m.enabled)
                    .map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.userName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FilterField>
          )}
          <FilterField label="Valor (R$)">
            <RangeInputs
              minValue={amount.min}
              maxValue={amount.max}
              onMinChange={(v) => setAmountFilter("min", v)}
              onMaxChange={(v) => setAmountFilter("max", v)}
            />
          </FilterField>
        </FilterPopover>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Carregando lançamentos…
        </div>
      ) : (
        <>
          <TransactionList
            transactions={transactions}
            categories={categories}
            canManage={isOwner}
            onReverse={(v) => {
              setActive(v)
              setReverseOpen(true)
            }}
            onCorrect={(v) => {
              setActive(v)
              setCorrectOpen(true)
            }}
          />
          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            onPageChange={goToPage}
            itemLabel="lançamento"
          />
        </>
      )}

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        fees={fees}
        categories={categories}
        isOwner={isOwner}
        members={members}
        onSubmit={handleCreate}
      />
      {isOwner && (
        <>
          <TransferDialog
            open={transferOpen}
            onOpenChange={setTransferOpen}
            onSubmit={transfer}
          />
          <CorrectionSheet
            open={correctOpen && active !== null && active.serviceId === null}
            onOpenChange={setCorrectOpen}
            transaction={
              active !== null && active.serviceId === null ? active.entity : null
            }
            onSubmit={handleCorrect}
          />
          <ServicePaymentCorrectionSheet
            open={correctOpen && active !== null && active.serviceId !== null}
            onOpenChange={setCorrectOpen}
            target={
              active !== null && active.serviceId !== null
                ? ({
                    amountCents: active.entity.grossCents,
                    paymentMethod: active.entity.paymentMethod,
                    dateISO: active.entity.transactedAt,
                  } satisfies ServicePaymentCorrectionTarget)
                : null
            }
            onSubmit={handleCorrectServicePayment}
          />
          <ReverseDialog
            open={reverseOpen}
            onOpenChange={setReverseOpen}
            transaction={active?.entity ?? null}
            onConfirm={handleReverse}
          />
        </>
      )}
    </div>
  )
}
