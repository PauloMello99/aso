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
import { useCurrentOrg } from "@/features/dashboard"
import { useCustomers } from "@/features/clients/hooks/use-customers"
import { useMembers } from "@/features/organizations/hooks/use-members"
import { useMaterials } from "@/features/stock/hooks/use-materials"
import type { MaterialFormValues } from "@/features/stock/schemas/stock.schemas"
import { parseReaisToCents } from "@/features/cashier/lib/money"
import { useServices } from "../hooks/use-services"
import { useServiceTypes } from "../hooks/use-service-types"
import { ServiceList } from "./service-list"
import { ServiceForm } from "./service-form"
import type { ServiceFormValues } from "../schemas/services.schemas"
import {
  SERVICE_STATUS_LABELS,
  type Service,
  type ServicesFilter,
  type ServiceStatus,
} from "../types"

interface ServicesPageProps {
  orgId: string
}

const STATUS_VALUES: ServiceStatus[] = ["pending", "paid", "canceled"]

function toCreateBody(values: ServiceFormValues) {
  return {
    customerId: values.customerId,
    serviceTypeId: values.serviceTypeId || null,
    performedBy: values.performedBy || null,
    description: values.description || null,
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

  const {
    services,
    loading,
    error,
    refetch,
    createService,
    updateService,
    cancelService,
    payService,
  } = useServices(orgId, filter)
  const { serviceTypes, createServiceType } = useServiceTypes(orgId)
  const { customers } = useCustomers(orgId, { enabledOnly: true })
  const { materials, createMaterial } = useMaterials(orgId)
  const { members } = useMembers(orgId)

  // Item 5 — cria um material a partir do form de serviço.
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

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setFormOpen(true)
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

  function applySearch() {
    setFilter((f) => ({ ...f, q: search || undefined }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Serviços</h1>
          <p className="mt-0.5 text-sm text-white/40">
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
          <Button onClick={openCreate} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            Novo serviço
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
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
            setFilter((f) => ({
              ...f,
              status: v === "all" ? undefined : (v as ServiceStatus),
            }))
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
              setFilter((f) => ({
                ...f,
                performedBy: v === "all" ? undefined : v,
              }))
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
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* List */}
      {loading && services.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-white/30">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Carregando serviços…
        </div>
      ) : (
        <ServiceList
          services={services}
          onEdit={openEdit}
          onPay={handlePay}
          onCancel={handleCancel}
        />
      )}

      {/* Form */}
      <ServiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
        isOwner={isOwner}
        customers={customers}
        members={members}
        serviceTypes={serviceTypes}
        materials={materials}
        onCreateType={createServiceType}
        onCreateMaterial={handleCreateMaterial}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
