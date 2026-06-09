"use client"

import { useState } from "react"
import {
  MoreVertical,
  PackagePlus,
  Pencil,
  SlidersHorizontal,
  History,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { isLowStock } from "../hooks/use-materials"
import { LowStockBadge } from "./low-stock-badge"
import type { Material } from "../types"

interface MaterialListProps {
  materials: Material[]
  onRestock: (material: Material) => void
  onEdit: (material: Material) => void
  onAdjust: (material: Material) => void
  onHistory: (material: Material) => void
  onDelete: (material: Material) => void
}

interface ActionMenuProps {
  material: Material
  onRestock: () => void
  onEdit: () => void
  onAdjust: () => void
  onHistory: () => void
  onDelete: () => void
}

function ActionMenu({
  material,
  onRestock,
  onEdit,
  onAdjust,
  onHistory,
  onDelete,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false)

  const items = [
    { icon: PackagePlus, label: "Repor estoque", action: onRestock, color: "text-emerald-400" },
    { icon: Pencil, label: "Editar", action: onEdit, color: "" },
    { icon: SlidersHorizontal, label: "Ajustar estoque", action: onAdjust, color: "" },
    { icon: History, label: "Histórico", action: onHistory, color: "" },
    { icon: Trash2, label: "Excluir", action: onDelete, color: "text-red-400" },
  ]

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <>
          {/* backdrop to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-8 z-50 min-w-[160px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#1a1a1d] py-1 shadow-xl">
            {items.map(({ icon: Icon, label, action, color }) => (
              <button
                key={label}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  action()
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/[0.06]",
                  color || "text-white/70 hover:text-white",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Mobile card ─────────────────────────────────────────────── */
function MaterialCard({
  material,
  onRestock,
  onEdit,
  onAdjust,
  onHistory,
  onDelete,
}: {
  material: Material
} & Omit<MaterialListProps, "materials">) {
  const low = isLowStock(material)
  const qty = parseFloat(material.stockQuantity)

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border p-4 transition-colors",
        low
          ? "border-orange-500/25 bg-orange-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {low && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-400" />}
          <span className="truncate font-medium text-white">{material.name}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className={cn("font-semibold tabular-nums", low ? "text-orange-400" : "text-white")}>
            {qty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            {material.unit ? ` ${material.unit}` : ""}
          </span>
          {parseFloat(material.minimumQuantity) > 0 && (
            <span className="text-white/30">
              mín.{" "}
              {parseFloat(material.minimumQuantity).toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </div>
        {low && (
          <div className="mt-2">
            <LowStockBadge />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
          onClick={() => onRestock(material)}
          title="Repor estoque"
        >
          <PackagePlus className="h-4 w-4" />
        </Button>
        <ActionMenu
          material={material}
          onRestock={() => onRestock(material)}
          onEdit={() => onEdit(material)}
          onAdjust={() => onAdjust(material)}
          onHistory={() => onHistory(material)}
          onDelete={() => onDelete(material)}
        />
      </div>
    </div>
  )
}

/* ─── Desktop table row ──────────────────────────────────────── */
function MaterialRow({
  material,
  onRestock,
  onEdit,
  onAdjust,
  onHistory,
  onDelete,
}: {
  material: Material
} & Omit<MaterialListProps, "materials">) {
  const low = isLowStock(material)
  const qty = parseFloat(material.stockQuantity)
  const minQty = parseFloat(material.minimumQuantity)

  return (
    <tr
      className={cn(
        "border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]",
        low && "bg-orange-500/[0.03]",
      )}
    >
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-2">
          {low && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-400" />}
          <span className="text-sm font-medium text-white">{material.name}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-white/40">
        {material.unit ?? <span className="text-white/20">—</span>}
      </td>
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            low ? "text-orange-400" : "text-white",
          )}
        >
          {qty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-sm text-white/40">
        {minQty > 0 ? (
          minQty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        ) : (
          <span className="text-white/20">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-white/40">
        {material.costPerUnit ? (
          `R$ ${parseFloat(material.costPerUnit).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ) : (
          <span className="text-white/20">—</span>
        )}
      </td>
      <td className="py-3 pl-3 pr-4">
        <div className="flex items-center justify-end gap-1">
          {low && <LowStockBadge compact />}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
            onClick={() => onRestock(material)}
            title="Repor estoque"
          >
            <PackagePlus className="h-4 w-4" />
          </Button>
          <ActionMenu
            material={material}
            onRestock={() => onRestock(material)}
            onEdit={() => onEdit(material)}
            onAdjust={() => onAdjust(material)}
            onHistory={() => onHistory(material)}
            onDelete={() => onDelete(material)}
          />
        </div>
      </td>
    </tr>
  )
}

/* ─── Main list ──────────────────────────────────────────────── */
export function MaterialList({
  materials,
  onRestock,
  onEdit,
  onAdjust,
  onHistory,
  onDelete,
}: MaterialListProps) {
  if (materials.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.08] py-16 text-center">
        <p className="text-sm text-white/30">Nenhum material cadastrado ainda.</p>
        <p className="mt-1 text-xs text-white/20">
          Clique em "Novo material" para adicionar.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="grid gap-3 sm:hidden">
        {materials.map((m) => (
          <MaterialCard
            key={m.id}
            material={m}
            onRestock={onRestock}
            onEdit={onEdit}
            onAdjust={onAdjust}
            onHistory={onHistory}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-white/[0.06] sm:block">
        <table className="w-full min-w-[600px] text-left">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="py-2.5 pl-4 pr-3 text-xs font-medium uppercase tracking-wider text-white/30">
                Material
              </th>
              <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-white/30">
                Unidade
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-white/30">
                Estoque
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-white/30">
                Mínimo
              </th>
              <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-white/30">
                Custo/un
              </th>
              <th className="py-2.5 pl-3 pr-4" />
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <MaterialRow
                key={m.id}
                material={m}
                onRestock={onRestock}
                onEdit={onEdit}
                onAdjust={onAdjust}
                onHistory={onHistory}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
