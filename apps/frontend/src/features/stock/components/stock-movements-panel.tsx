"use client"

import { useEffect, useState } from "react"
import { ArrowDownLeft, ArrowUpRight, RefreshCw, SlidersHorizontal } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog"
import { PaginationBar } from "@/shared/components/pagination-bar"
import { useStockMovements } from "../hooks/use-stock-movements"
import type { Material, StockMovement, StockMovementType } from "../types"

interface StockMovementsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  material: Material | null
}

const movementMeta: Record<
  StockMovementType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  restock: {
    label: "Reposição",
    icon: <ArrowDownLeft className="h-3.5 w-3.5" />,
    color: "text-success",
  },
  service_consumption: {
    label: "Consumo em atendimento",
    icon: <ArrowUpRight className="h-3.5 w-3.5" />,
    color: "text-info",
  },
  manual_adjustment: {
    label: "Ajuste manual",
    icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
    color: "text-primary",
  },
}

function MovementRow({ m }: { m: StockMovement }) {
  const meta = movementMeta[m.type]
  const delta = parseFloat(m.quantityDelta)
  const isPositive = delta >= 0
  const dateStr = new Date(m.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <li className="flex items-start gap-3 border-b border-foreground/[0.06] py-3 last:border-0">
      <span className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-foreground">{meta.label}</span>
          <span
            className={`shrink-0 text-sm font-medium tabular-nums ${
              isPositive ? "text-success" : "text-destructive"
            }`}
          >
            {isPositive ? "+" : ""}
            {delta.toLocaleString("pt-BR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs text-foreground/30">{dateStr}</span>
          {m.note && (
            <span className="text-xs italic text-foreground/40">
              &quot;{m.note}&quot;
            </span>
          )}
        </div>
      </div>
    </li>
  )
}

export function StockMovementsPanel({
  open,
  onOpenChange,
  orgId,
  material,
}: StockMovementsPanelProps) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!open) setPage(1)
  }, [open])

  const {
    movements,
    total,
    page: currentPage,
    pages,
    loading,
    error,
  } = useStockMovements(orgId, open ? (material?.id ?? null) : null, {
    page,
    limit: 20,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Movimentações de estoque</DialogTitle>
          <DialogDescription>
            {material ? (
              <>
                Histórico completo de{" "}
                <span className="font-medium text-foreground">{material.name}</span>.
              </>
            ) : (
              "Histórico de movimentações"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-foreground/40">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          )}
          {error && (
            <p className="py-4 text-center text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && movements.length === 0 && (
            <p className="py-8 text-center text-sm text-foreground/30">
              Nenhuma movimentação registrada ainda.
            </p>
          )}
          {!loading && !error && movements.length > 0 && (
            <>
              <ul className="divide-y divide-transparent">
                {movements.map((m) => (
                  <MovementRow key={m.id} m={m} />
                ))}
              </ul>
              <PaginationBar
                page={currentPage}
                pages={pages}
                total={total}
                onPageChange={setPage}
                itemLabel="movimentação"
                className="mt-2"
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
