import { ImageIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import { formatRelative } from "../lib/quote-dates"
import type { QuoteRequestListItem } from "../types"

export const NO_PROFESSIONAL_LABEL = "Sem profissional"

export function formatImageCount(count: number): string {
  if (count === 0) return "Sem imagens"
  return count === 1 ? "1 imagem" : `${count} imagens`
}

interface QuoteRequestCardProps {
  request: QuoteRequestListItem
  isOwner: boolean
  selected: boolean
  onSelect: (id: string) => void
}

export function QuoteRequestCard({
  request,
  isOwner,
  selected,
  onSelect,
}: QuoteRequestCardProps) {
  const unread = !request.viewed

  return (
    <button
      type="button"
      onClick={() => onSelect(request.id)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "min-h-[44px] w-full rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        unread
          ? "border-primary/20 bg-primary/[0.04] hover:bg-primary/[0.08]"
          : "border-foreground/[0.06] bg-foreground/[0.02] hover:bg-foreground/[0.04]",
        selected && "ring-2 ring-ring",
      )}
    >
      <div className="flex items-center gap-2">
        {unread && (
          <>
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-primary"
            />
            <span className="sr-only">Não lido</span>
          </>
        )}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-base sm:text-sm",
            unread ? "font-semibold text-foreground" : "font-normal text-foreground/80",
          )}
        >
          {request.requesterName}
        </span>
        <span className="shrink-0 text-xs text-foreground/40">
          {formatRelative(request.createdAt)}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 break-words text-base text-foreground/60 sm:text-sm">
        {request.ideaPreview}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-foreground/40">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {formatImageCount(request.imageCount)}
        </span>
        {isOwner && (
          <Badge variant="outline" className="max-w-[60%] truncate">
            {request.targetDisplayName ?? NO_PROFESSIONAL_LABEL}
          </Badge>
        )}
      </div>
    </button>
  )
}
