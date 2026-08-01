"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { Users, UserCheck, Plus, RefreshCw, Search } from "lucide-react"
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
import {
  FilterPopover,
  FilterField,
} from "@/shared/components/ui/filter-popover"
import {
  ExportMenu,
  type ExportFormat,
} from "@/shared/components/ui/export-menu"
import { downloadExport } from "@/shared/lib/download-export"
import { KpiCard } from "@/shared/components/kpi-card"
import { useCurrentOrg } from "@/features/dashboard"
import { useCustomers } from "../hooks/use-customers"
import { useCustomerOrigins } from "../hooks/use-customer-origins"
import { CustomerList } from "./customer-list"
import { CustomerForm } from "./customer-form"
import { MONTH_OPTIONS } from "../lib/birth-month"
import type { Customer, CustomersFilter, Gender } from "../types"
import type { CustomerFormValues } from "../schemas/client.schemas"

interface ClientsPageProps {
  orgId: string
}

const EXPORT_COLUMNS = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "gender", label: "Gênero" },
  { key: "birthDate", label: "Nascimento" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado" },
  { key: "country", label: "País" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Cadastro" },
]

export function ClientsPage({ orgId }: ClientsPageProps) {
  const router = useRouter()
  const { org } = useCurrentOrg()
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const [advanced, setAdvanced] = useState<{
    status?: "active" | "inactive"
    originId?: string
    gender?: Gender
    from?: string
    to?: string
    birthMonth?: number
    city?: string
    state?: string
  }>({})

  const [cityInput, setCityInput] = useState("")
  const [stateInput, setStateInput] = useState("")

  useEffect(() => {
    const t = setTimeout(() => {
      setAdvanced((a) => ({ ...a, city: cityInput.trim() || undefined }))
    }, 300)
    return () => clearTimeout(t)
  }, [cityInput])

  useEffect(() => {
    const t = setTimeout(() => {
      setAdvanced((a) => ({ ...a, state: stateInput.trim() || undefined }))
    }, 300)
    return () => clearTimeout(t)
  }, [stateInput])

  const advancedCount =
    (advanced.status ? 1 : 0) +
    (advanced.originId ? 1 : 0) +
    (advanced.gender ? 1 : 0) +
    (advanced.from ? 1 : 0) +
    (advanced.to ? 1 : 0) +
    (advanced.birthMonth ? 1 : 0) +
    (advanced.city ? 1 : 0) +
    (advanced.state ? 1 : 0)

  function clearAdvanced() {
    setAdvanced({})
    setCityInput("")
    setStateInput("")
  }

  const filter = useMemo<CustomersFilter | undefined>(() => {
    const f: CustomersFilter = { ...advanced }
    if (search) f.search = search
    return Object.keys(f).length ? f : undefined
  }, [search, advanced])

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

  function openDetail(customer: Customer) {
    void router.push(`/dashboard/org/${org.slug}/clients/${customer.id}`)
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
      number: values.number,
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

  async function handleExport(fields: string[], format: ExportFormat) {
    await downloadExport(
      `/orgs/${orgId}/customers/export`,
      `clientes-${new Date().toISOString().slice(0, 10)}`,
      format,
      {
        search,
        status: advanced.status,
        originId: advanced.originId,
        gender: advanced.gender,
        from: advanced.from,
        to: advanced.to,
        birthMonth: advanced.birthMonth,
        city: advanced.city,
        state: advanced.state,
        fields: fields.join(","),
      },
    )
  }

  return (
    <div className="space-y-6">
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
          <ExportMenu columns={EXPORT_COLUMNS} onExport={handleExport} />
          <Button onClick={openCreate} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={Users}
          iconClassName="text-text-muted"
          label="Total de clientes"
          value={String(customers.length)}
          loading={loading}
        />
        <KpiCard
          icon={UserCheck}
          iconClassName="text-success"
          label="Ativos"
          value={String(activeCount)}
          loading={loading}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone…"
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <FilterPopover activeCount={advancedCount} onClear={clearAdvanced}>
          <FilterField label="Status">
            <Select
              value={advanced.status ?? "all"}
              onValueChange={(v) =>
                setAdvanced((a) => ({
                  ...a,
                  status:
                    v === "all" ? undefined : (v as "active" | "inactive"),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Origem">
            <Select
              value={advanced.originId ?? "all"}
              onValueChange={(v) =>
                setAdvanced((a) => ({
                  ...a,
                  originId: v === "all" ? undefined : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {origins.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Gênero">
            <Select
              value={advanced.gender ?? "all"}
              onValueChange={(v) =>
                setAdvanced((a) => ({
                  ...a,
                  gender: v === "all" ? undefined : (v as Gender),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gênero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="female">Feminino</SelectItem>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <div className="grid grid-cols-2 gap-2">
            <FilterField label="Cadastro de">
              <DatePicker
                value={advanced.from ?? ""}
                onChange={(v) =>
                  setAdvanced((a) => ({ ...a, from: v || undefined }))
                }
                placeholder="Início"
              />
            </FilterField>
            <FilterField label="Até">
              <DatePicker
                value={advanced.to ?? ""}
                onChange={(v) =>
                  setAdvanced((a) => ({ ...a, to: v || undefined }))
                }
                placeholder="Fim"
              />
            </FilterField>
          </div>
          <FilterField label="Aniversariantes do mês">
            <Select
              value={advanced.birthMonth ? String(advanced.birthMonth) : "all"}
              onValueChange={(v) =>
                setAdvanced((a) => ({
                  ...a,
                  birthMonth: v === "all" ? undefined : Number(v),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <div className="grid grid-cols-2 gap-2">
            <FilterField label="Cidade">
              <Input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Busca exata"
                autoComplete="off"
              />
            </FilterField>
            <FilterField label="Estado">
              <Input
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                placeholder="Busca exata"
                autoComplete="off"
              />
            </FilterField>
          </div>
        </FilterPopover>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

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
          onViewDetail={openDetail}
        />
      )}

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
