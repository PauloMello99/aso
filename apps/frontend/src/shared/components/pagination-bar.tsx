"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export interface PaginationBarProps {
  page: number
  pages: number
  total: number
  onPageChange: (page: number) => void
  itemLabel?: string
  className?: string
}

export function PaginationBar({
  page,
  pages,
  total,
  onPageChange,
  itemLabel = "registro",
  className,
}: PaginationBarProps) {
  if (total === 0 && pages <= 1) {
    return null
  }

  const totalPages = Math.max(1, pages)

  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-sm text-foreground/50 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <span>
        {total} {itemLabel}
        {total !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={pages <= 0 || page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
