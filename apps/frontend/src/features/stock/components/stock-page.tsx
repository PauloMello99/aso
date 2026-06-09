"use client"

import { useState } from "react"
import { Package, AlertTriangle, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useMaterials, isLowStock } from "../hooks/use-materials"
import { MaterialList } from "./material-list"
import { MaterialForm } from "./material-form"
import { RestockForm } from "./restock-form"
import { AdjustStockForm } from "./adjust-stock-form"
import { StockMovementsPanel } from "./stock-movements-panel"
import type { Material } from "../types"
import type { MaterialFormValues, RestockFormValues, AdjustStockFormValues } from "../schemas/stock.schemas"

interface StockPageProps {
  orgId: string
}

interface DialogState {
  materialForm: boolean
  restockForm: boolean
  adjustForm: boolean
  movementsPanel: boolean
}

export function StockPage({ orgId }: StockPageProps) {
  const {
    materials,
    loading,
    error,
    refetch,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    restockMaterial,
    adjustStock,
  } = useMaterials(orgId)

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

  /* ─── Summary stats ─────────────────────────────────────────── */
  const lowStockCount = materials.filter(isLowStock).length

  /* ─── Form handlers ─────────────────────────────────────────── */
  async function handleMaterialSubmit(values: MaterialFormValues) {
    const body = {
      name: values.name,
      unit: values.unit || null,
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
    await adjustStock(activeMaterial.id, values.quantityDelta, values.note || null)
  }

  async function handleDelete(material: Material) {
    if (!confirm(`Excluir "${material.name}"? Esta ação não pode ser desfeita.`)) return
    await deleteMaterial(material.id)
  }

  /* ─── Render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Estoque</h1>
          <p className="mt-0.5 text-sm text-white/40">
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
          <Button
            onClick={() => openDialog("materialForm")}
            className="flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Novo material
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          icon={<Package className="h-4 w-4 text-white/40" />}
          label="Total de materiais"
          value={String(materials.length)}
          loading={loading}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-4 w-4 text-orange-400" />}
          label="Estoque baixo"
          value={String(lowStockCount)}
          valueClass={lowStockCount > 0 ? "text-orange-400" : undefined}
          loading={loading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* List */}
      {loading && materials.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-white/30">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Carregando materiais…
        </div>
      ) : (
        <MaterialList
          materials={materials}
          onRestock={(m) => openDialog("restockForm", m)}
          onEdit={(m) => openDialog("materialForm", m)}
          onAdjust={(m) => openDialog("adjustForm", m)}
          onHistory={(m) => openDialog("movementsPanel", m)}
          onDelete={handleDelete}
        />
      )}

      {/* Dialogs */}
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

/* ─── Summary card sub-component ────────────────────────────── */
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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-white/40">{label}</span>
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded bg-white/[0.06]" />
      ) : (
        <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueClass ?? "text-white"}`}>
          {value}
        </p>
      )}
    </div>
  )
}
