"use client"

import { useEffect, useState } from "react"
import { Package, AlertTriangle, Plus, RefreshCw, Search } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
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
import { PaginationBar } from "@/shared/components/pagination-bar"
import { useMaterials } from "../hooks/use-materials"
import { MaterialList } from "./material-list"
import { MaterialForm } from "./material-form"
import { RestockForm } from "./restock-form"
import { AdjustStockForm } from "./adjust-stock-form"
import { StockMovementsPanel } from "./stock-movements-panel"
import type { Material, MaterialsFilter } from "../types"
import type { MaterialFormValues, RestockFormValues, AdjustStockFormValues } from "../schemas/stock.schemas"

interface StockPageProps {
  orgId: string
}

const EXPORT_COLUMNS = [
  { key: "name", label: "Material" },
  { key: "stock", label: "Estoque" },
  { key: "minimum", label: "Mínimo" },
  { key: "cost", label: "Custo unitário (R$)" },
  { key: "shareable", label: "Compartilhável" },
  { key: "lowStock", label: "Estoque baixo" },
  { key: "status", label: "Status" },
  { key: "lastUsed", label: "Último uso" },
]

interface DialogState {
  materialForm: boolean
  restockForm: boolean
  adjustForm: boolean
  movementsPanel: boolean
}

export function StockPage({ orgId }: StockPageProps) {
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [advanced, setAdvanced] = useState<{
    shareable?: boolean
    minCost: string
    maxCost: string
  }>({ minCost: "", maxCost: "" })

  const advancedCount =
    (advanced.shareable !== undefined ? 1 : 0) +
    (advanced.minCost.trim() ? 1 : 0) +
    (advanced.maxCost.trim() ? 1 : 0)

  function clearAdvanced() {
    setAdvanced({ minCost: "", maxCost: "" })
  }

  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [search, showArchived, advanced])

  async function handleExport(fields: string[], format: ExportFormat) {
    await downloadExport(
      `/orgs/${orgId}/materials/export`,
      `estoque-${new Date().toISOString().slice(0, 10)}`,
      format,
      {
        q: search || undefined,
        archived: showArchived ? "true" : undefined,
        shareable:
          advanced.shareable === undefined
            ? undefined
            : String(advanced.shareable),
        minCost: advanced.minCost.trim()
          ? advanced.minCost.replace(",", ".")
          : undefined,
        maxCost: advanced.maxCost.trim()
          ? advanced.maxCost.replace(",", ".")
          : undefined,
        fields: fields.join(","),
      },
    )
  }

  const filter: MaterialsFilter = {
    name: search || undefined,
    archived: showArchived || undefined,
    shareable: advanced.shareable,
    minCost: advanced.minCost.trim()
      ? advanced.minCost.replace(",", ".")
      : undefined,
    maxCost: advanced.maxCost.trim()
      ? advanced.maxCost.replace(",", ".")
      : undefined,
    page,
  }

  const {
    materials,
    total,
    pages,
    loading,
    error,
    refetch,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    restockMaterial,
    adjustStock,
    archiveMaterial,
  } = useMaterials(orgId, filter)

  const { total: lowStockCount } = useMaterials(
    orgId,
    { ...filter, lowStockOnly: true, page: 1, limit: 1 },
    { enabled: !!orgId },
  )

  const [dialogs, setDialogs] = useState<DialogState>({
    materialForm: false,
    restockForm: false,
    adjustForm: false,
    movementsPanel: false,
  })
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null)

  function openDialog(key: keyof DialogState, material?: Material | null) {
    setActiveMaterial(material ?? null)
    setDialogs((d) => ({ ...d, [key]: true }))
  }

  function closeDialog(key: keyof DialogState) {
    setDialogs((d) => ({ ...d, [key]: false }))
  }

  async function handleMaterialSubmit(values: MaterialFormValues) {
    const body = {
      name: values.name,
      shareable: values.shareable ?? false,
      minimumQuantity: values.minimumQuantity || undefined,
      costPerUnit: values.costPerUnit || null,
    }
    if (activeMaterial) {
      await updateMaterial(activeMaterial.id, body)
    } else {
      await createMaterial(body)
    }
  }

  async function handleRestock(values: RestockFormValues) {
    if (!activeMaterial) return
    await restockMaterial(activeMaterial.id, values.quantity, values.note || null)
  }

  async function handleAdjust(values: AdjustStockFormValues) {
    if (!activeMaterial) return
    const delta =
      values.direction === "remove" ? `-${values.quantity}` : values.quantity
    await adjustStock(activeMaterial.id, delta, values.note || null)
  }

  async function handleDelete(material: Material) {
    if (!confirm(`Excluir "${material.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteMaterial(material.id)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Não foi possível excluir o material."
      if (confirm(`${msg}\n\nDeseja arquivar "${material.name}" em vez disso?`)) {
        await archiveMaterial(material.id, true)
      }
    }
  }

  async function handleArchive(material: Material) {
    await archiveMaterial(material.id, !material.archivedAt)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Estoque</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            Gerencie os materiais usados nos atendimentos.
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
          <Button
            onClick={() => openDialog("materialForm")}
            className="flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Novo material
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
          <Input
            placeholder="Buscar material por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived((v) => !v)}
          className="shrink-0"
        >
          {showArchived ? "Ver ativos" : "Ver arquivados"}
        </Button>
        <FilterPopover activeCount={advancedCount} onClear={clearAdvanced}>
          <FilterField label="Tipo de material">
            <Select
              value={
                advanced.shareable === undefined
                  ? "all"
                  : advanced.shareable
                    ? "shared"
                    : "consumable"
              }
              onValueChange={(v) =>
                setAdvanced((a) => ({
                  ...a,
                  shareable:
                    v === "all" ? undefined : v === "shared" ? true : false,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="consumable">Consumível</SelectItem>
                <SelectItem value="shared">Compartilhável</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Custo unitário (R$)">
            <RangeInputs
              minValue={advanced.minCost}
              maxValue={advanced.maxCost}
              onMinChange={(v) => setAdvanced((a) => ({ ...a, minCost: v }))}
              onMaxChange={(v) => setAdvanced((a) => ({ ...a, maxCost: v }))}
            />
          </FilterField>
        </FilterPopover>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          icon={<Package className="h-4 w-4 text-foreground/40" />}
          label="Total de materiais"
          value={String(total)}
          loading={loading}
        />
        <SummaryCard
          icon={
            <AlertTriangle
              className={`h-4 w-4 ${lowStockCount > 0 ? "text-warning" : "text-foreground/40"}`}
            />
          }
          label="Estoque baixo"
          value={String(lowStockCount)}
          valueClass={lowStockCount > 0 ? "text-warning" : undefined}
          loading={loading}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning-subtle px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong className="font-semibold">
              {lowStockCount} {lowStockCount === 1 ? "material" : "materiais"}
            </strong>{" "}
            abaixo do estoque mínimo.
          </span>
        </div>
      )}

      {loading && materials.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-foreground/30">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Carregando materiais…
        </div>
      ) : (
        <>
          <MaterialList
            materials={materials}
            onRestock={(m) => openDialog("restockForm", m)}
            onEdit={(m) => openDialog("materialForm", m)}
            onAdjust={(m) => openDialog("adjustForm", m)}
            onHistory={(m) => openDialog("movementsPanel", m)}
            onDelete={handleDelete}
            onArchive={handleArchive}
          />
          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            onPageChange={setPage}
            itemLabel="material"
          />
        </>
      )}

      <MaterialForm
        open={dialogs.materialForm}
        onOpenChange={(open) => !open && closeDialog("materialForm")}
        material={activeMaterial}
        onSubmit={handleMaterialSubmit}
      />
      <RestockForm
        open={dialogs.restockForm}
        onOpenChange={(open) => !open && closeDialog("restockForm")}
        material={activeMaterial}
        onSubmit={handleRestock}
      />
      <AdjustStockForm
        open={dialogs.adjustForm}
        onOpenChange={(open) => !open && closeDialog("adjustForm")}
        material={activeMaterial}
        onSubmit={handleAdjust}
      />
      <StockMovementsPanel
        open={dialogs.movementsPanel}
        onOpenChange={(open) => !open && closeDialog("movementsPanel")}
        orgId={orgId}
        material={activeMaterial}
      />
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  valueClass,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClass?: string
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
        <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueClass ?? "text-foreground"}`}>
          {value}
        </p>
      )}
    </div>
  )
}
