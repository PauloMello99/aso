"use client"

import { useState } from "react"
import { Plus, RefreshCw, Search } from "lucide-react"
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
import { useCustomers } from "@/features/clients/hooks/use-customers"
import { useCustomerOptions } from "@/features/clients/hooks/use-customer-options"
import { useMembers } from "@/features/organizations/hooks/use-members"
import { useMaterials } from "@/features/stock/hooks/use-materials"
import { useMaterialOptions } from "@/features/stock/hooks/use-material-options"
import type { MaterialFormValues } from "@/features/stock/schemas/stock.schemas"
import { parseReaisToCents } from "@/features/cashier/lib/money"
import { cashierErrorMessage } from "@/features/cashier/lib/error-messages"
import { useServices } from "../hooks/use-services"
import { useServiceTypes } from "../hooks/use-service-types"
import { toCorrectPaymentBody } from "../lib/correct-payment-body"
import { ServiceList } from "./service-list"
import { ServiceForm } from "./service-form"
import { ServicePaymentCorrectionSheet } from "./service-payment-correction-sheet"
import type {
  CorrectServicePaymentFormValues,
  ServiceFormValues,
} from "../schemas/services.schemas"
import {
  SERVICE_STATUS_LABELS,
  SERVICE_PAYMENT_METHODS,
  SERVICE_PAYMENT_METHOD_LABELS,
  type Service,
  type ServicePaymentMethod,
  type ServicesFilter,
  type ServiceStatus,
} from "../types"

interface ServicesPageProps {
  orgId: string
}

const STATUS_VALUES: ServiceStatus[] = ["pending", "paid", "canceled"]

const EXPORT_COLUMNS = [
  { key: "date", label: "Data" },
  { key: "customer", label: "Cliente" },
  { key: "type", label: "Tipo" },
  { key: "professional", label: "Profissional" },
  { key: "description", label: "Descrição" },
  { key: "amount", label: "Valor (R$)" },
  { key: "paymentMethod", label: "Método" },
  { key: "status", label: "Status" },
]

function toCreateBody(values: ServiceFormValues) {
  return {
    customerId: values.customerId,
    serviceTypeId: values.serviceTypeId || null,
    performedBy: values.performedBy || null,
    description: values.description || null,
    anamnesisResponseId: values.anamnesisResponseId,
    amountCents: parseReaisToCents(values.amount),
    paymentMethod: values.paymentMethod,
    paymentStatus: values.paymentStatus,
    performedAt: values.performedAt
      ? new Date(values.performedAt).toISOString()
      : undefined,
    materials: values.materials.map((line) =>
      line.shareable
        ? { materialId: line.materialId, finished: !!line.finished }
        : {
            materialId: line.materialId,
            quantity: line.quantity
              ? Number(line.quantity.replace(",", "."))
              : 0,
          },
    ),
  }
}

function toUpdateBody(values: ServiceFormValues) {
  return {
    customerId: values.customerId,
    serviceTypeId: values.serviceTypeId || null,
    performedBy: values.performedBy || null,
    description: values.description || null,
    anamnesisResponseId: values.anamnesisResponseId,
    performedAt: values.performedAt
      ? new Date(values.performedAt).toISOString()
      : undefined,
  }
}

export function ServicesPage({ orgId }: ServicesPageProps) {
  const { org } = useCurrentOrg()
  const isOwner = org.role === "owner"

  const [filter, setFilter] = useState<ServicesFilter>({})
  const [search, setSearch] = useState("")
  const [amount, setAmount] = useState({ min: "", max: "" })

  function updateFilter(patch: Partial<ServicesFilter>) {
    setFilter((f) => ({ ...f, ...patch, page: 1 }))
  }

  function goToPage(p: number) {
    setFilter((f) => ({ ...f, page: p }))
  }

  const advancedCount =
    (filter.from ? 1 : 0) +
    (filter.to ? 1 : 0) +
    (filter.serviceTypeId ? 1 : 0) +
    (filter.customerId ? 1 : 0) +
    (filter.paymentMethod ? 1 : 0) +
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
      serviceTypeId: undefined,
      customerId: undefined,
      paymentMethod: undefined,
      minCents: undefined,
      maxCents: undefined,
    })
  }

  const {
    services,
    total,
    page,
    pages,
    loading,
    error,
    refetch,
    createService,
    updateService,
    cancelService,
    payService,
    correctPayment,
  } = useServices(orgId, filter)
  const { serviceTypes, createServiceType } = useServiceTypes(orgId)
  const { customers } = useCustomers(orgId, { enabledOnly: true })
  const { options: customerOptions, truncated: customersTruncated } =
    useCustomerOptions(orgId)
  const { options: materialOptions } = useMaterialOptions(orgId)
  const { createMaterial } = useMaterials(orgId, undefined, { enabled: false })
  const { members } = useMembers(orgId)

  async function handleCreateMaterial(values: MaterialFormValues) {
    return createMaterial({
      name: values.name,
      shareable: values.shareable ?? false,
      minimumQuantity: values.minimumQuantity || undefined,
      costPerUnit: values.costPerUnit || null,
    })
  }

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [correctingPayment, setCorrectingPayment] = useState<Service | null>(
    null,
  )

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setFormOpen(true)
  }

  function openCorrectPayment(s: Service) {
    setCorrectingPayment(s)
  }

  async function handleSubmit(values: ServiceFormValues) {
    if (editing) {
      await updateService(editing.id, toUpdateBody(values))
    } else {
      await createService(toCreateBody(values))
    }
  }

  async function handleCancel(s: Service) {
    if (!confirm("Cancelar este serviço? O pagamento será estornado e o estoque devolvido.")) {
      return
    }
    try {
      await cancelService(s.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível cancelar.")
    }
  }

  async function handlePay(s: Service) {
    try {
      await payService(s.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível registrar.")
    }
  }

  async function handleCorrectPayment(values: CorrectServicePaymentFormValues) {
    if (!correctingPayment) return
    try {
      await correctPayment(correctingPayment.id, toCorrectPaymentBody(values))
    } catch (err) {
      alert(cashierErrorMessage(err))
    }
  }

  function applySearch() {
    updateFilter({ q: search || undefined })
  }

  async function handleExport(fields: string[], format: ExportFormat) {
    await downloadExport(
      `/orgs/${orgId}/services/export`,
      `servicos-${new Date().toISOString().slice(0, 10)}`,
      format,
      {
        from: filter.from,
        to: filter.to,
        serviceTypeId: filter.serviceTypeId,
        customerId: filter.customerId,
        performedBy: filter.performedBy,
        status: filter.status,
        paymentMethod: filter.paymentMethod,
        minCents: filter.minCents,
        maxCents: filter.maxCents,
        q: filter.q,
        fields: fields.join(","),
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Serviços</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            Atendimentos do estúdio — cliente, materiais e pagamento.
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
            Novo serviço
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
          <Input
            placeholder="Buscar por cliente ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            onBlur={applySearch}
            className="pl-9"
          />
        </div>
        <Select
          value={filter.status ?? "all"}
          onValueChange={(v) =>
            updateFilter({
              status: v === "all" ? undefined : (v as ServiceStatus),
            })
          }
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {SERVICE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isOwner && (
          <Select
            value={filter.performedBy ?? "all"}
            onValueChange={(v) =>
              updateFilter({
                performedBy: v === "all" ? undefined : v,
              })
            }
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {members
                .filter((m) => m.enabled)
                .map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.userName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
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
          <FilterField label="Tipo de serviço">
            <Select
              value={filter.serviceTypeId ?? "all"}
              onValueChange={(v) =>
                updateFilter({
                  serviceTypeId: v === "all" ? undefined : v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {serviceTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Cliente">
            <Select
              value={filter.customerId ?? "all"}
              onValueChange={(v) =>
                updateFilter({
                  customerId: v === "all" ? undefined : v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {customerOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customersTruncated && (
              <p className="mt-1 text-xs text-foreground/40">
                Mostrando os primeiros 1000 clientes — refine a busca se não encontrar
                quem procura.
              </p>
            )}
          </FilterField>
          <FilterField label="Método de pagamento">
            <Select
              value={filter.paymentMethod ?? "all"}
              onValueChange={(v) =>
                updateFilter({
                  paymentMethod:
                    v === "all" ? undefined : (v as ServicePaymentMethod),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os métodos</SelectItem>
                {SERVICE_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {SERVICE_PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
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

      {loading && services.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Carregando serviços…
        </div>
      ) : (
        <>
          <ServiceList
            services={services}
            isOwner={isOwner}
            onEdit={openEdit}
            onPay={handlePay}
            onCancel={handleCancel}
            onCorrectPayment={openCorrectPayment}
          />
          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            onPageChange={goToPage}
            itemLabel="serviço"
          />
        </>
      )}

      <ServiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        orgId={orgId}
        service={editing}
        isOwner={isOwner}
        customers={customers}
        members={members}
        serviceTypes={serviceTypes}
        materials={materialOptions}
        onCreateType={createServiceType}
        onCreateMaterial={handleCreateMaterial}
        onSubmit={handleSubmit}
      />

      <ServicePaymentCorrectionSheet
        open={!!correctingPayment}
        onOpenChange={(v) => !v && setCorrectingPayment(null)}
        target={
          correctingPayment && {
            amountCents: correctingPayment.amountCents,
            paymentMethod: correctingPayment.paymentMethod,
            dateISO: correctingPayment.performedAt,
          }
        }
        onSubmit={handleCorrectPayment}
      />
    </div>
  )
}
