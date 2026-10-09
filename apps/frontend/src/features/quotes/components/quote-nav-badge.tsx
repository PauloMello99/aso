import { cn } from "@/shared/lib/utils"

interface QuoteNavBadgeProps {
  count: number
  /** Sidebar recolhida (md+): troca o contador por um ponto. */
  collapsed: boolean
}

const MAX_VISIBLE_COUNT = 99

export function QuoteNavBadge({ count, collapsed }: QuoteNavBadgeProps) {
  if (count <= 0) return null

  const text = count > MAX_VISIBLE_COUNT ? `${MAX_VISIBLE_COUNT}+` : String(count)

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-none text-primary-foreground",
          collapsed && "md:hidden",
        )}
      >
        {text}
      </span>
      {collapsed && (
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 hidden h-2 w-2 rounded-full bg-primary ring-2 ring-background md:block"
        />
      )}
      <span className="sr-only">
        {count === 1 ? "1 pedido não lido" : `${count} pedidos não lidos`}
      </span>
    </>
  )
}
