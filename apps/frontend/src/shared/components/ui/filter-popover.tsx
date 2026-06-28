"use client"

import * as React from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { cn } from "@/shared/lib/utils"

interface FilterPopoverProps {
  /** Quantidade de filtros avançados ativos (mostrada no badge). */
  activeCount: number
  /** Limpa todos os filtros avançados. */
  onClear: () => void
  /** Campos do filtro. */
  children: React.ReactNode
  className?: string
}

/**
 * Gatilho + painel reutilizável de "Filtros avançados" (RPT-1).
 * Mostra um contador dos filtros ativos e um botão para limpá-los.
 */
export function FilterPopover({
  activeCount,
  onClear,
  children,
  className,
}: FilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={activeCount > 0 ? "default" : "outline"}
          className={cn("shrink-0 gap-2", className)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background/20 px-1.5 text-xs font-semibold tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Filtros avançados
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={activeCount === 0}
            className="h-7 px-2 text-xs text-foreground/60"
          >
            Limpar
          </Button>
        </div>
        <div className="mt-3 space-y-3">{children}</div>
      </PopoverContent>
    </Popover>
  )
}

/** Rótulo padrão para um campo do painel de filtros. */
export function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-foreground/50">{label}</span>
      {children}
    </div>
  )
}

/** Par de inputs numéricos (mín / máx) para faixas de valor. */
export function RangeInputs({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  placeholder = ["Mín", "Máx"],
  inputMode = "decimal",
}: {
  minValue: string
  maxValue: string
  onMinChange: (v: string) => void
  onMaxChange: (v: string) => void
  placeholder?: [string, string]
  inputMode?: "decimal" | "numeric"
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={minValue}
        onChange={(e) => onMinChange(e.target.value)}
        placeholder={placeholder[0]}
        inputMode={inputMode}
        className="h-9 w-full rounded-md border border-foreground/10 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-foreground/30"
      />
      <span className="text-foreground/30">–</span>
      <input
        value={maxValue}
        onChange={(e) => onMaxChange(e.target.value)}
        placeholder={placeholder[1]}
        inputMode={inputMode}
        className="h-9 w-full rounded-md border border-foreground/10 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-foreground/30"
      />
    </div>
  )
}
