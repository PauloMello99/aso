"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

interface ListPaginationProps {
  page: number
  totalPages: number
  totalItems: number
  /** Plural do item para o resumo (ex.: "serviços", "transações"). */
  itemsLabel: string
  onPageChange: (page: number) => void
}

export function ListPagination({
  page,
  totalPages,
  totalItems,
  itemsLabel,
  onPageChange,
}: ListPaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-foreground/40">
        Página {page} de {totalPages} · {totalItems} {itemsLabel}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
