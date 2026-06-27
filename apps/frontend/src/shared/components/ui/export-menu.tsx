"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"

export interface ExportColumn {
  key: string
  label: string
}

interface ExportMenuProps {
  /** Colunas disponíveis (chaves espelham o backend `?fields=`). */
  columns: ExportColumn[]
  /** Dispara o download com as chaves selecionadas. */
  onExport: (fields: string[]) => Promise<void> | void
  disabled?: boolean
}

/**
 * Botão "Exportar" + seletor de colunas (RPT-2). Por padrão todas marcadas;
 * o usuário ajusta quais campos vão no CSV e baixa pelo backend (respeita filtros).
 */
export function ExportMenu({ columns, onExport, disabled }: ExportMenuProps) {
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(columns.map((c) => c.key)),
  )
  const [busy, setBusy] = React.useState(false)

  const allChecked = selected.size === columns.length

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(columns.map((c) => c.key)))
  }

  async function handleExport() {
    const fields = columns.filter((c) => selected.has(c.key)).map((c) => c.key)
    if (fields.length === 0) return
    setBusy(true)
    try {
      await onExport(fields)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="shrink-0 gap-2"
          title="Exportar CSV"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Campos do CSV
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="h-7 px-2 text-xs text-foreground/60"
          >
            {allChecked ? "Limpar" : "Tudo"}
          </Button>
        </div>
        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
          {columns.map((c) => (
            <label
              key={c.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-foreground/[0.04]"
            >
              <input
                type="checkbox"
                checked={selected.has(c.key)}
                onChange={() => toggle(c.key)}
                className="h-4 w-4 accent-primary"
              />
              {c.label}
            </label>
          ))}
        </div>
        <Button
          onClick={() => void handleExport()}
          disabled={busy || selected.size === 0}
          className="mt-3 w-full gap-2"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Baixar CSV
        </Button>
      </PopoverContent>
    </Popover>
  )
}
