"use client"

import { useEffect, useMemo, useState } from "react"
import { Users, UserCheck, Plus, RefreshCw, Search, Download } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { getSession } from "@/features/auth/lib/session"
import { useCustomers } from "../hooks/use-customers"
import { useCustomerOrigins } from "../hooks/use-customer-origins"
import { CustomerList } from "./customer-list"
import { CustomerForm } from "./customer-form"
import type { Customer, Gender } from "../types"
import type { CustomerFormValues } from "../schemas/client.schemas"

interface ClientsPageProps {
  orgId: string
}

export function ClientsPage({ orgId }: ClientsPageProps) {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  // Debounce the search input → query filter
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const filter = useMemo(
    () => (search ? { search } : undefined),
    [search],
  )

  const {
    customers,
    loading,
    error,
    refetch,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomers(orgId, filter)
  const { origins } = useCustomerOrigins(orgId)

  const [formOpen, setFormOpen] = useState(false)
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null)

  const activeCount = useMemo(
    () => customers.filter((c) => c.enabled).length,
    [customers],
  )

  function openCreate() {
    setActiveCustomer(null)
    setFormOpen(true)
  }

  function openEdit(customer: Customer) {
    setActiveCustomer(customer)
    setFormOpen(true)
  }

  async function handleSubmit(values: CustomerFormValues) {
    const body = {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      gender: values.gender ? (values.gender as Gender) : null,
      birthDate: values.birthDate || null,
      address: values.address || null,
      addressLine2: values.addressLine2 || null,
      city: values.city || null,
      state: values.state || null,
      postalCode: values.postalCode || null,
      country: values.country || null,
      originId: values.originId || null,
      notes: values.notes || null,
    }
    if (activeCustomer) {
      await updateCustomer(activeCustomer.id, body)
    } else {
      await createCustomer(body)
    }
  }

  async function handleToggleStatus(customer: Customer) {
    await updateCustomer(customer.id, { enabled: !customer.enabled })
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Excluir "${customer.name}"? Esta ação não pode ser desfeita.`))
      return
    await deleteCustomer(customer.id)
  }

  async function handleExport() {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
    const token = getSession()?.accessToken
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    const res = await fetch(
      `${api}/orgs/${orgId}/customers/export?${params.toString()}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
    )
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Clientes</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            Cadastro e histórico dos clientes do estúdio.
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
          <Button
            variant="outline"
            onClick={() => void handleExport()}
            className="shrink-0"
            title="Exportar CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button onClick={openCreate} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          icon={<Users className="h-4 w-4 text-foreground/40" />}
          label="Total de clientes"
          value={String(customers.length)}
          loading={loading}
        />
        <SummaryCard
          icon={<UserCheck className="h-4 w-4 text-emerald-400" />}
          label="Ativos"
          value={String(activeCount)}
          loading={loading}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone…"
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* List */}
      {loading && customers.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Carregando clientes…
        </div>
      ) : (
        <CustomerList
          customers={customers}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      )}

      {/* Dialog */}
      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        orgId={orgId}
        customer={activeCustomer}
        origins={origins}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

/* ─── Summary card sub-component ────────────────────────────── */
function SummaryCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: string
  loading?: boolean
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-foreground/40">{label}</span>
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded bg-foreground/[0.06]" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      )}
    </div>
  )
}
